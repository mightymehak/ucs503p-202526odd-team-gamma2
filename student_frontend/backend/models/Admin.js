// models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Needed here for the matchPassword method

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    uniqueId: {
      type: String,
      required: true,
      unique: true, // Recommended: Ensure ID is unique
      minlength: 6,
      maxlength: 6,
      match: /^\d{6}$/,
    },
    // 🔑 ADDED: Password field for secure authentication
    password: { 
      type: String,
      required: true,
      select: false, // Prevents password from being returned by default queries
    },
  },
  {
    timestamps: true,
  }
);

// Method to compare the password for login
adminSchema.methods.matchPassword = async function (enteredPassword) {
  // Uses bcrypt to compare the entered password with the stored hash
  // NOTE: bcryptjs must be installed (npm install bcryptjs)
  return await bcrypt.compare(enteredPassword, this.password);
};

// Removed the pre-save hashing hook since you are inserting pre-hashed passwords

module.exports = mongoose.model('Admin', adminSchema);