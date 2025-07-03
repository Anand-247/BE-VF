const Admin = require("../models/Admin");

const createAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

    if (adminExists) {
      console.log("Admin already exists");
      return;
    }

    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: "Admin",
      role: "super_admin",
    });

    await admin.save();
    console.log("Admin created successfully");
  } catch (error) {
    console.error("Error creating admin:", error);
  }
};

module.exports = createAdmin;
