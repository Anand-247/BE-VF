const express = require("express")
const { body, validationResult } = require("express-validator")
const Contact = require("../models/Contact")
const auth = require("../middleware/auth")

const router = express.Router()

// Submit contact form (public)
router.post(
  "/",
  [
    body("name").notEmpty().trim(),
    body("email").isEmail().normalizeEmail(),
    body("message").notEmpty().trim(),
    body("phone").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const contact = new Contact(req.body)
      await contact.save()

      res.status(201).json({
        message: "Contact form submitted successfully",
        id: contact._id,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get all contact messages (admin only)
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const query = {}
    if (status) query.status = status

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 }

    const contacts = await Contact.find(query)
      .populate("repliedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Contact.countDocuments(query)

    res.json({
      contacts,
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

// Reply to contact message (admin only)
router.put("/:id/reply", auth, [body("reply").notEmpty().trim()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const contact = await Contact.findById(req.params.id)
    if (!contact) {
      return res.status(404).json({ message: "Contact message not found" })
    }

    contact.reply = req.body.reply
    contact.status = "replied"
    contact.repliedAt = new Date()
    contact.repliedBy = req.admin._id

    await contact.save()
    await contact.populate("repliedBy", "name email")

    res.json(contact)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update contact status (admin only)
router.put("/:id/status", auth, [body("status").isIn(["new", "replied", "resolved"])], async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
    if (!contact) {
      return res.status(404).json({ message: "Contact message not found" })
    }

    contact.status = req.body.status
    await contact.save()

    res.json(contact)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete contact message (admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id)
    if (!contact) {
      return res.status(404).json({ message: "Contact message not found" })
    }

    res.json({ message: "Contact message deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
