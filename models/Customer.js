const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },

    // Ownership is only via salesperson; manager is derivable via the salesperson’s user doc
    salespersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ salespersonId: 1, isActive: 1 });

module.exports = mongoose.model('Customer', CustomerSchema);
