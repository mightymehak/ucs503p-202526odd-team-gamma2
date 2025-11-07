// scripts/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const admins = [
      {
        name: 'Super Admin',
        email: 'admin@lostandfound.com',
        password: 'admin123',
        role: 'admin',
      },
      {
        name: 'Manager Admin',
        email: 'manager@lostandfound.com',
        password: 'manager123',
        role: 'admin',
      },
    ];

    for (const admin of admins) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(admin.password, salt);
      
      await User.findOneAndUpdate(
        { email: admin.email },
        admin,
        { upsert: true, new: true }
      );
    }

    console.log('✅ Admin users created');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmins();