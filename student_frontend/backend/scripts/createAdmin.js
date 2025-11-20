// scripts/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
require('dotenv').config();

const createAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const admins = [
      {
        name: 'Super Admin',
        email: 'admin@lostandfound.com',
        password: 'admin123',
        uniqueId: '123456',
      },
      {
        name: 'Manager Admin',
        email: 'manager@lostandfound.com',
        password: 'manager123',
        uniqueId: '654321',
      },
    ];

    for (const admin of admins) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(admin.password, salt);
      
      await Admin.findOneAndUpdate(
        { email: admin.email },
        admin,
        { upsert: true, new: true }
      );
    }

    console.log('✅ Admin accounts created in Admin collection');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmins();