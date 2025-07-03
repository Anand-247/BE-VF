const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      // required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: [
      {
        url: String,
        publicId: String,
        alt: String,
      },
    ],
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        default: "cm",
      },
    },
    materials: [String],
    weight: Number,
    inStock: {
      type: Boolean,
      default: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
    },
    isNewProduct: {
      type: Boolean,
      default: false,
    },
    isTopRated: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    offers: [
      {
        title: String,
        description: String,
        discount: Number,
        validUntil: Date,
      },
    ],
    combos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Combo",
      },
    ],
    seoTitle: String,
    seoDescription: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Create slug from name before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }
  next()
})

// Populate category on find
productSchema.pre(/^find/, function (next) {
  this.populate("category", "name slug")
  next()
})

module.exports = mongoose.model("Product", productSchema)
