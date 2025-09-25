const mongoose = require('mongoose');
const { PLAN_CYCLE } = require('../utils/enums');

const PlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },
    billingCycle: {
      type: String,
      enum: Object.values(PLAN_CYCLE),
      required: true,
    },
    price: { type: Number, required: true, min: 0 },

    features: { type: [String], default: [] },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', PlanSchema);
