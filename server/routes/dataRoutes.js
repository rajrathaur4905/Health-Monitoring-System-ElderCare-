/**
 * Data Routes
 * Defines all API endpoints for health data operations
 */

const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

/**
 * POST /api/data
 * Receive and store sensor data from Arduino
 */
router.post('/', dataController.storeData);

/**
 * GET /api/data/latest
 * Get the most recent health data record
 */
router.get('/latest', dataController.getLatestData);

/**
 * GET /api/data/history
 * Get historical health data (with pagination)
 * Query parameters: limit (default 50), skip (default 0)
 */
router.get('/history', dataController.getDataHistory);

/**
 * GET /api/data/stats
 * Get statistics (average, min, max values)
 * Query parameter: range (24h, 7d, 30d)
 */
router.get('/stats', dataController.getStatistics);

/**
 * GET /api/data/alerts
 * Get fall detection alerts
 * Query parameter: limit (default 20)
 */
router.get('/alerts', dataController.getFallAlerts);

/**
 * DELETE /api/data/cleanup
 * Delete old data (cleanup)
 * Query parameter: days (default 30 days to keep)
 */
router.delete('/cleanup', dataController.cleanupOldData);

module.exports = router;
