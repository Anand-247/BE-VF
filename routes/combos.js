const express = require("express")
const { body, validationResult } = require("express-validator")
const Combo = require("../models/Combo")
const auth = require("../middleware/auth")
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary")

const router = express.Router()

// Get all active combos (public)
router.get("/", async (req, res) => {
  try {
    const combos = await Combo.find({
      isActive: true,
      $or: [{ validUntil: { $gte: new Date() } }, { validUntil: { $exists: false } }],
    }).populate("products.product", "name price images")

    res.json(combos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create combo (admin only)
router.post(
  "/",
  auth,
  upload.single("image"),
  [
    body("name").notEmpty().trim(),
    body("description").notEmpty().trim(),
    body("products").isArray({ min: 2 }),
    body("discountPercentage").isNumeric().isFloat({ min: 0, max: 100 }),
    body("originalPrice").isNumeric().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const comboData = { ...req.body }

      // Parse products array
      if (typeof req.body.products === "string") {
        comboData.products = JSON.parse(req.body.products)
      }

      // Upload image if provided
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "combos")
        comboData.image = {
          url: result.secure_url,
          publicId: result.public_id,w
        }
      }

      const combo = new Combo(comboData)
      await combo.save()
      await combo.populate("products.product", "name price images")

      res.status(201).json(combo)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Update combo (admin only)
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id)
    if (!combo) {
      return res.status(404).json({ message: "Combo not found" })
    }

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        if (key === "products" && typeof req.body[key] === "string") {
          combo[key] = JSON.parse(req.body[key])
        } else {
          combo[key] = req.body[key]
        }
      }
    })

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (combo.image?.publicId) {
        await deleteFromCloudinary(combo.image.publicId)
      }

      // Upload new image
      const result = await uploadToCloudinary(req.file.buffer, "combos")
      combo.image = {
        url: result.secure_url,
        publicId: result.public_id,
      }
    }

    await combo.save()
    await combo.populate("products.product", "name price images")

    res.json(combo)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete combo (admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id)
    if (!combo) {
      return res.status(404).json({ message: "Combo not found" })
    }

    // Delete image from Cloudinary
    if (combo.image?.publicId) {
      await deleteFromCloudinary(combo.image.publicId)
    }

    await Combo.findByIdAndDelete(req.params.id)
    res.json({ message: "Combo deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
