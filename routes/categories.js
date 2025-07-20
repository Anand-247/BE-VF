const express = require("express")
const { body, validationResult } = require("express-validator")
const Category = require("../models/Category")
const auth = require("../middleware/auth")
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary")

const router = express.Router()

// Get all categories with product count (public)
router.get("/", async (req, res) => {
  try {
    const categoriesWithCount = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "products", // collection name in MongoDB (case-sensitive!)
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $addFields: {
          productCount: { $size: "$products" },
        },
      },
      {
        $project: {
          products: 0, // hide product array
        },
      },
      { $sort: { sortOrder: 1, name: 1 } },
    ])

    res.json(categoriesWithCount)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})


// Get category by slug (public)
router.get("/:slug", async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
    })

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    res.json(category)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Create category (admin only)
router.post(
  "/",
  auth,
  upload.single("image"),
  [body("name").notEmpty().trim(), body("description").optional().trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, description, sortOrder } = req.body

      // Check if category already exists
      const existingCategory = await Category.findOne({ name })
      if (existingCategory) {
        return res.status(400).json({ message: "Category already exists" })
      }

      const categoryData = {
        name,
        description,
        sortOrder: sortOrder || 0,
      }

      // Upload image if provided
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "categories")
        categoryData.image = {
          url: result.secure_url,
          publicId: result.public_id,
        }
      }

      const category = new Category(categoryData)
      await category.save()

      res.status(201).json(category)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Update category (admin only)
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    const { name, description, sortOrder, isActive } = req.body

    // Update fields
    if (name) category.name = name
    if (description !== undefined) category.description = description
    if (sortOrder !== undefined) category.sortOrder = sortOrder
    if (isActive !== undefined) category.isActive = isActive

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (category.image?.publicId) {
        await deleteFromCloudinary(category.image.publicId)
      }

      // Upload new image
      const result = await uploadToCloudinary(req.file.buffer, "categories")
      category.image = {
        url: result.secure_url,
        publicId: result.public_id,
      }
    }

    await category.save()
    res.json(category)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete category (admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    // Delete image from Cloudinary
    if (category.image?.publicId) {
      await deleteFromCloudinary(category.image.publicId)
    }

    await Category.findByIdAndDelete(req.params.id)
    res.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
