/**
 * Data Controller
 * Handles all business logic for health data operations
 */

const HealthData = require('../models/HealthData');

function sendNoCache(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toValidDate(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Store incoming sensor data from Arduino
 * POST /api/data
 */
exports.storeData = async (req, res) => {
  try {
    const { temperature, bpm, spo2, fall, lat, lon, timestamp } = req.body;
    const normalizedTemperature = toNumber(temperature);
    const normalizedBpm = toNumber(bpm);
    const normalizedSpo2 = toNumber(spo2);
    const normalizedLat = toNumber(lat);
    const normalizedLon = toNumber(lon);
    const normalizedFall = toBoolean(fall);

    // Validate required fields
    if (
      normalizedTemperature === null ||
      normalizedBpm === null ||
      normalizedSpo2 === null ||
      normalizedFall === null ||
      normalizedLat === null ||
      normalizedLon === null
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing required fields',
      });
    }

    const safeTemperature = clamp(normalizedTemperature, 0, 120);
    const safeBpm = clamp(normalizedBpm, 0, 255);
    const safeSpo2 = clamp(normalizedSpo2, 0, 100);
    const safeLat = clamp(normalizedLat, -90, 90);
    const safeLon = clamp(normalizedLon, -180, 180);

    // Create new health data document
    const healthData = new HealthData({
      temperature: safeTemperature,
      bpm: safeBpm,
      spo2: safeSpo2,
      fall: normalizedFall,
      lat: safeLat,
      lon: safeLon,
      timestamp: toValidDate(timestamp),
    });

    // Save to database
    await healthData.save();

    // Log fall detection alert
    if (normalizedFall) {
      console.log(`⚠️ FALL DETECTED! Time: ${healthData.timestamp}`);
    }

    res.status(201).json({
      success: true,
      message: 'Data stored successfully',
      data: healthData,
    });
  } catch (error) {
    console.error('Error storing data:', error);
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: 'Error storing data',
      error: error.message,
    });
  }
};

/**
 * Get the latest health data record
 * GET /api/data/latest
 */
exports.getLatestData = async (req, res) => {
  try {
    sendNoCache(res);

    const latestData = await HealthData.findOne()
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!latestData) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No data available yet',
      });
    }

    res.status(200).json({
      success: true,
      data: latestData,
    });
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching latest data',
      error: error.message,
    });
  }
};

/**
 * Get health data history (last 50 records)
 * GET /api/data/history
 */
exports.getDataHistory = async (req, res) => {
  try {
    sendNoCache(res);
    const limit = Math.min(toPositiveInt(req.query.limit, 50), 500);
    const skip = Math.max(Number.parseInt(req.query.skip, 10) || 0, 0);

    // Sort by server-side create time for deterministic ordering.
    const historyData = await HealthData.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const totalCount = await HealthData.countDocuments();

    res.status(200).json({
      success: true,
      data: historyData,
      pagination: {
        total: totalCount,
        limit,
        skip,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching history',
      error: error.message,
    });
  }
};

/**
 * Get health statistics (average, min, max values)
 * GET /api/data/stats
 */
exports.getStatistics = async (req, res) => {
  try {
    sendNoCache(res);
    const timeRange = req.query.range || '24h'; // 24h, 7d, 30d

    // Calculate date range
    let startDate = new Date();
    if (timeRange === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (timeRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    // Aggregate statistics
    const stats = await HealthData.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          avgTemperature: { $avg: '$temperature' },
          avgBpm: { $avg: '$bpm' },
          avgSpo2: { $avg: '$spo2' },
          maxTemperature: { $max: '$temperature' },
          minTemperature: { $min: '$temperature' },
          maxBpm: { $max: '$bpm' },
          minBpm: { $min: '$bpm' },
          maxSpo2: { $max: '$spo2' },
          minSpo2: { $min: '$spo2' },
          fallCount: {
            $sum: { $cond: [{ $eq: ['$fall', true] }, 1, 0] },
          },
          totalRecords: { $sum: 1 },
        },
      },
    ]);

    if (!stats.length) {
      return res.status(200).json({
        success: true,
        timeRange,
        stats: {
          avgTemperature: 0,
          avgBpm: 0,
          avgSpo2: 0,
          maxTemperature: 0,
          minTemperature: 0,
          maxBpm: 0,
          minBpm: 0,
          maxSpo2: 0,
          minSpo2: 0,
          fallCount: 0,
          totalRecords: 0,
        },
        message: 'No data found for the selected time range',
      });
    }

    res.status(200).json({
      success: true,
      timeRange,
      stats: stats[0],
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};

/**
 * Get fall detection alerts
 * GET /api/data/alerts
 */
exports.getFallAlerts = async (req, res) => {
  try {
    sendNoCache(res);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 200);

    const alerts = await HealthData.find({ fall: true })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message,
    });
  }
};

/**
 * Delete old data (cleanup)
 * DELETE /api/data/cleanup
 */
exports.cleanupOldData = async (req, res) => {
  try {
    const daysToKeep = parseInt(req.query.days) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await HealthData.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old records`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error cleaning up data:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up data',
      error: error.message,
    });
  }
};
