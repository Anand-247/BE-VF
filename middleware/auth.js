const jwt = require("jsonwebtoken")
const Admin = require("../models/Admin")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const admin = await Admin.findById(decoded.id).select("-password")

    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: "Invalid token or admin not active." })
    }

    req.admin = admin
    next()
  } catch (error) {
    res.status(401).json({ message: "Invalid token." })
  }
}

module.exports = auth
