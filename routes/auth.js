const express = require("express")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const Admin = require("../models/Admin")
const auth = require("../middleware/auth")

const router = express.Router()

// Login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").isLength({ min: 6 })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password } = req.body

      // Find admin
      const admin = await Admin.findOne({ email })
      if (!admin) {
        return res.status(400).json({ message: "Invalid credentials" })
      }

      // Check password
      const isMatch = await admin.comparePassword(password)
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" })
      }

      // Update last login
      admin.lastLogin = new Date()
      await admin.save()

      // Generate token
      const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })

      res.json({
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get current admin
router.get("/me", auth, async (req, res) => {
  res.json({
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
    },
  })
})

// Logout (client-side token removal)
router.post("/logout", auth, (req, res) => {
  res.json({ message: "Logged out successfully" })
})

module.exports = router
