/**
 * HealthData Model
 * Defines the schema for storing elderly health monitoring data
 */

const mongoose = require('mongoose');

// Define the health data schema
const healthDataSchema = new mongoose.Schema(
  {
    // Temperature in Celsius
    temperature: {
      type: Number,
      required: true,
      min: 0,
      max: 120,
    },

    // Heart Rate (Beats Per Minute)
    bpm: {
      type: Number,
      required: true,
      min: 0,
      max: 255,
    },

    // Oxygen Saturation Level (Percentage)
    spo2: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Fall Detection Flag
    fall: {
      type: Boolean,
      default: false,
    },

    // GPS Latitude
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    // GPS Longitude
    lon: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    // Timestamp of data collection
    timestamp: {
      type: Date,
      default: Date.now,
      index: true, // Index for faster queries
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Create and export the model
const HealthData = mongoose.model('HealthData', healthDataSchema);

module.exports = HealthData;
