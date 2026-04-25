const bcrypt = require('bcrypt');
const User = require('../models/User');

const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function generateSessionToken() {
  return Buffer.from(`${Date.now()}-${Math.random().toString(36).slice(2)}`).toString('base64url');
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).lean(false);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: generateSessionToken(),
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
};

exports.signup = async (req, res) => {
  try {
    const { name, email, contact, password, gmail_otp } = req.body || {};

    const normalizedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);
    const contactNumber = parseInteger(contact);
    const otpNumber = parseInteger(gmail_otp);

    if (!normalizedName || !normalizedEmail || !contactNumber || !password || !otpNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name, contact, email, password, and Gmail OTP are required',
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), SALT_ROUNDS);

    const createdUser = await User.create({
      name: normalizedName,
      contact: contactNumber,
      email: normalizedEmail,
      password: hashedPassword,
      gmail_otp: otpNumber,
    });

    return res.status(201).json({
      success: true,
      message: 'Signup successful. Please login.',
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Signup failed',
      error: error.message,
    });
  }
};
