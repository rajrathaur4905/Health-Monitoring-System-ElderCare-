/**
 * Main Server File
 * Elderly Health Monitoring IoT Dashboard
 * 
 * This server handles:
 * - Receiving sensor data from Arduino
 * - Storing data in MongoDB
 * - Providing REST APIs for the frontend
 * - Serving static files
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Initialize Express app
const app = express();

// ============ MIDDLEWARE ============
// Enable CORS for all routes
app.use(cors());

// Parse JSON and form data
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath)); // Serve static files from client folder

// ============ DATABASE CONNECTION ============
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/elderly-health-monitoring';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// ============ ROUTES ============
// Import data routes
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');

// Use data routes with /api/data prefix
app.use('/api/data', dataRoutes);
app.use('/api/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// ============ ERROR HANDLER ============
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  Elderly Health Monitoring IoT Dashboard             ║
║  Server running on: http://localhost:${PORT}                 ║
║  Environment: ${process.env.NODE_ENV || 'development'}             ║
║  Database: ${mongoURI}    ║
╚══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down server...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
