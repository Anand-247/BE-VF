const express = require("express")
const { body, validationResult } = require("express-validator")
const Order = require("../models/Order")
const auth = require("../middleware/auth")

const router = express.Router()

// Create order (public)
router.post(
  "/",
  [
    body("orderType").isIn(["buy_now", "cart_checkout"]),
    body("customer.name").notEmpty().trim(),
    body("customer.phone").notEmpty().trim(),
    body("customer.address").notEmpty().trim(),
    body("items").isArray({ min: 1 }),
    body("totalAmount").isNumeric().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const order = new Order(req.body)
      await order.save()
      await order.populate("items.product", "name price images")

      res.status(201).json(order)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Get all orders (admin only)
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, orderType, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const query = {}

    if (status) query.status = status
    if (orderType) query.orderType = orderType

    const skip = (page - 1) * limit
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 }

    const orders = await Order.find(query)
      .populate("items.product", "name price images")
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Order.countDocuments(query)

    res.json({
      orders,
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

// Get order by ID (admin only)
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "name price images")
      .populate("processedBy", "name email")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json(order)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// Update order status (admin only)
router.put("/:id", auth, async (req, res) => {
  try {
    const { status, notes } = req.body

    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (status) order.status = status
    if (notes !== undefined) order.notes = notes

    if (status && status !== "pending") {
      order.processedAt = new Date()
      order.processedBy = req.admin._id
    }

    await order.save()
    await order.populate("items.product", "name price images")

    res.json(order)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete order (admin only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json({ message: "Order deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
