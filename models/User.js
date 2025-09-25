const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES } = require('../utils/enums');

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },

    // Only salespeople have a manager (reference, not duplicated anywhere else)
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, isActive: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (e) {
    next(e);
  }
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
