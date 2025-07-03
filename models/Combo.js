const mongoose = require("mongoose")

const comboSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    comboPrice: {
      type: Number,
      required: true,
    },
    image: {
      url: String,
      publicId: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    validUntil: Date,
  },
  {
    timestamps: true,
  },
)

// Calculate combo price before saving
comboSchema.pre("save", function (next) {
  if (this.originalPrice && this.discountPercentage) {
    this.comboPrice = this.originalPrice * (1 - this.discountPercentage / 100)
  }
  next()
})

module.exports = mongoose.model("Combo", comboSchema)
