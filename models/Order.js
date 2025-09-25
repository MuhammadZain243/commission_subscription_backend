const mongoose = require('mongoose');
const { ORDER_STATUS, ORDER_LINE_KIND } = require('../utils/enums');

const OrderLineSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: Object.values(ORDER_LINE_KIND),
      required: true,
    }, // 'PLAN' or 'ADDON'
    refId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Plan._id or AddOn._id

    // Accounting snapshot (NOT duplication; required to preserve invoice history)
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    salespersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // If this is a renewal for a subscription, we reference it here (no other sub data duplicated)
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },

    lines: {
      type: [OrderLineSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    total: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.CREATED,
      index: true,
    },
    paidAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ subscriptionId: 1 });

OrderSchema.pre('validate', function (next) {
  const kinds = new Set(this.lines.map((l) => l.kind));
  if (kinds.size > 1)
    return next(new Error('Order cannot mix PLAN and ADDON lines.'));
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
