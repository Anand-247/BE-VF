const express = require("express")
const { body, validationResult } = require("express-validator")
const Product = require("../models/Product")
const auth = require("../middleware/auth")
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary")

const router = express.Router()

// Get all products with filters (public)
router.get("/", async (req, res) => {
  try {
    const {
      category,
      search,
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
      newProducts,
      topRated,
    } = req.query

    const query = { isActive: true }

    // Filter by category
    if (category) {
      query.category = category
    }

    // Search functionality
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    // Filter new products
    if (newProducts === "true") {
      query.isNewProduct = true
    }

    // Filter top rated products
    if (topRated === "true") {
      query.isTopRated = true
    }

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 }

    const products = await Product.find(query)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Product.countDocuments(query)

    res.json({
      products,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get product by slug (public)
router.get("/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("category", "name slug")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Create product (admin only)
router.post(
  "/",
  auth,
  upload.array("images", 5),
  [
    body("name").notEmpty().trim(),
    body("description").notEmpty().trim(),
    body("price").isNumeric().isFloat({ min: 0 }),
    body("category").isMongoId(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const productData = { ...req.body }

      // Parse JSON fields
      if (req.body.dimensions) {
        productData.dimensions = JSON.parse(req.body.dimensions)
      }
      if (req.body.materials) {
        productData.materials = JSON.parse(req.body.materials)
      }
      if (req.body.offers) {
        productData.offers = JSON.parse(req.body.offers)
      }

      // Upload images
      if (req.files && req.files.length > 0) {
        const imagePromises = req.files.map((file) => uploadToCloudinary(file.buffer, "products"))

        const uploadResults = await Promise.all(imagePromises)
        productData.images = uploadResults.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
          alt: productData.name,
        }))
      }

      const product = new Product(productData)
      await product.save()
      await product.populate("category", "name slug")

      res.status(201).json(product)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Update product (admin only)
router.put("/:id", auth, upload.array("images", 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (key !== "images" && req.body[key] !== undefined) {
        if (key === "dimensions" || key === "materials" || key === "offers") {
          product[key] = JSON.parse(req.body[key])
        } else {
          product[key] = req.body[key]
        }
      }
    })

    // Handle new images
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map((file) => uploadToCloudinary(file.buffer, "products"))

      const uploadResults = await Promise.all(imagePromises)
      const newImages = uploadResults.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        alt: product.name,
      }))

      product.images = [...product.images, ...newImages]
    }

    await product.save()
    await product.populate("category", "name slug")

    res.json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete product image (admin only)
router.delete("/:id/images/:imageId", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const imageIndex = product.images.findIndex((img) => img._id.toString() === req.params.imageId)

    if (imageIndex === -1) {
      return res.status(404).json({ message: "Image not found" })
    }

    const image = product.images[imageIndex]

    // Delete from Cloudinary
    if (image.publicId) {
      await deleteFromCloudinary(image.publicId)
    }

    // Remove from product
    product.images.splice(imageIndex, 1)
    await product.save()

    res.json({ message: "Image deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete product (admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images
        .filter((img) => img.publicId)
        .map((img) => deleteFromCloudinary(img.publicId))

      await Promise.all(deletePromises)
    }

    await Product.findByIdAndDelete(req.params.id)
    res.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
