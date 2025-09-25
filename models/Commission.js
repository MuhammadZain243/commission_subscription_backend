const mongoose = require('mongoose');
const { COMMISSION_STATUS } = require('../utils/enums');

const CommissionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    salespersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // managerId is derivable via the salesperson; if you pay manager overrides,
    // compute at query time (no storage duplication). If performance requires,
    // you can add managerId later as a denormalized field.
    baseAmount: { type: Number, required: true, min: 0 }, // usually order.total
    salespersonRate: { type: Number, required: true, min: 0 }, // e.g., 0.10
    salespersonAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(COMMISSION_STATUS),
      default: COMMISSION_STATUS.PENDING,
      index: true,
    },
    approvedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

CommissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Commission', CommissionSchema);
