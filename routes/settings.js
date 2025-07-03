const express = require("express")
const { body, validationResult } = require("express-validator")
const Settings = require("../models/Settings")
const auth = require("../middleware/auth")

const router = express.Router()

// Get settings (public - limited fields)
router.get("/public", async (req, res) => {
  try {
    const settings = await Settings.findOne().select(
      "whatsappNumber shopAddress mapEmbedCode shopEmail shopPhone socialMedia businessHours",
    )
    res.json(settings || {})
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Get all settings (admin only)
router.get("/", auth, async (req, res) => {
  try {
    const settings = await Settings.findOne()
    res.json(settings || {})
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Update settings (admin only)
router.put(
  "/",
  auth,
  [
    body("whatsappNumber").optional().trim(),
    body("shopAddress").optional().trim(),
    body("shopEmail").optional().isEmail().normalizeEmail(),
    body("shopPhone").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      let settings = await Settings.findOne()

      if (!settings) {
        settings = new Settings(req.body)
      } else {
        Object.keys(req.body).forEach((key) => {
          if (req.body[key] !== undefined) {
            settings[key] = req.body[key]
          }
        })
      }

      await settings.save()
      res.json(settings)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

module.exports = router
