const mongoose = require("mongoose")

const settingsSchema = new mongoose.Schema(
  {
    whatsappNumber: {
      type: String,
      required: true,
    },
    shopAddress: {
      type: String,
      required: true,
    },
    mapEmbedCode: {
      type: String,
    },
    shopEmail: {
      type: String,
    },
    shopPhone: {
      type: String,
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
    },
    businessHours: {
      monday: String,
      tuesday: String,
      wednesday: String,
      thursday: String,
      friday: String,
      saturday: String,
      sunday: String,
    },
  },
  {
    timestamps: true,
  },
)

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

module.exports = Settings;
