const mongoose = require('mongoose');
const { SUB_STATUS } = require('../utils/enums');

const SubscriptionSchema = new mongoose.Schema(
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

    // manager is derivable from the salesperson; we do NOT duplicate it here
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(SUB_STATUS),
      default: 'ACTIVE',
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    nextBillingDate: { type: Date }, // computed from plan billing cycle
    cancelAt: { type: Date },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ status: 1, nextBillingDate: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
