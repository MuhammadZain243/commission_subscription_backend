const mongoose = require('mongoose');

const AddOnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AddOn', AddOnSchema);
