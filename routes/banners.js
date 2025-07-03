const express = require("express")
const { body, validationResult } = require("express-validator")
const Banner = require("../models/Banner")
const auth = require("../middleware/auth")
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary")

const router = express.Router()

// Get all active banners (public)
router.get("/", async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 })
    res.json(banners)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Create banner (admin only)
router.post("/", auth, upload.single("image"), [body("title").notEmpty().trim()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const bannerData = { ...req.body }

    // Upload image if provided
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "banners")
      bannerData.image = {
        url: result.secure_url,
        publicId: result.public_id,
      }
    }

    const banner = new Banner(bannerData)
    await banner.save()

    res.status(201).json(banner)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update banner (admin only)
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" })
    }

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        banner[key] = req.body[key]
      }
    })

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (banner.image?.publicId) {
        await deleteFromCloudinary(banner.image.publicId)
      }

      // Upload new image
      const result = await uploadToCloudinary(req.file.buffer, "banners")
      banner.image = {
        url: result.secure_url,
        publicId: result.public_id,
      }
    }

    await banner.save()
    res.json(banner)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete banner (admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" })
    }

    // Delete image from Cloudinary
    if (banner.image?.publicId) {
      await deleteFromCloudinary(banner.image.publicId)
    }

    await Banner.findByIdAndDelete(req.params.id)
    res.json({ message: "Banner deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
