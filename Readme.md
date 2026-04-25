#  Elderly Health Monitoring System  (ElderGaurd)

A complete production-ready modern full-stack IoT-based elderly health monitoring system with live vitals dashboard, fall detection alerts, and GPS map tracking.


---

## Table of Contents

- [Overview](#overview)
- Features
- Technology Stack
- Project Structure
- Prerequisites
- Installation Guide
- Configuration
- Running the Application
- API Endpoints
- Arduino Integration
- Database Schema
- Usage Guide
- Troubleshooting
- Future Improvements
- Contributing
- License

---

## 🎯 Overview

This system provides a comprehensive solution for monitoring the health and safety of elderly people in real-time. It consists of:

1. **Arduino Hardware** - Equipped with various sensors to collect vital signs
2. **Node.js Backend** - REST API server to receive and process sensor data
3. **MongoDB Database** - Secure cloud storage for health records
4. **Web Dashboard** - Modern, responsive interface for viewing real-time health data

The system monitors:
- 🌡️ **Body Temperature** (Celsius)
- 💓 **Heart Rate** (Beats Per Minute)
- 💨 **Oxygen Saturation** (SpO2 Percentage)
- 🚨 **Fall Detection** (Accelerometer-based)
- 📍 **GPS Location** (Real-time tracking)

---

## ✨ Features

### Real-Time Monitoring
- Live health data updates every 2 seconds
- Instant visualization on web dashboard
- Historical data retention for trend analysis

### Fall Detection System
- Advanced accelerometer-based detection
- Immediate alerts and notifications
- Automatic emergency triggers

### GPS Location Tracking
- Real-time location updates
- Interactive map visualization using Leaflet.js
- Location history for emergency responders

### Advanced Analytics
- Temperature trend charts
- Heart rate analysis
- SpO2 level monitoring
- Multi-metric comparison graphs
- 24-hour statistics and averages

### Smart Alert System
- Abnormal value detection
- Fall detection alerts with blinking UI
- Browser notifications
- SMS integration ready (Twilio)

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Touch-friendly interface
- Accessible design

### Secure Data Storage
- MongoDB for reliable data persistence
- Automatic backups
- Data validation and sanitization

---

## 🛠 Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Mongoose** - MongoDB object modeling
- **CORS** - Cross-origin resource sharing
- **Body-Parser** - Request body parsing

### Database
- **MongoDB** - NoSQL database
- **Cloud Storage** - Atlas (optional)

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling (Flexbox, Grid)
- **Vanilla JavaScript** - No dependencies (lightweight)
- **Chart.js 3.9** - Interactive data visualization
- **Leaflet.js 1.9** - Map visualization

### Hardware
- **Arduino UNO R4 WiFi** - Microcontroller
- **MAX30102** - Pulse oximeter and heart rate sensor
- **ADXL345** - 3-axis accelerometer
- **LM35** - Temperature sensor
- **NEO-6M** - GPS module
- **I2C LCD Display** - 16x2 display

### Development Tools
- **npm** - Package manager
- **nodemon** - Auto-reload server
- **.env** - Environment configuration

---

## 📁 Project Structure

```
elderly-health-monitoring/
│
├── server/                          # Backend
│   ├── models/
│   │   └── HealthData.js           # MongoDB schema
│   ├── routes/
│   │   └── dataRoutes.js          # API routes
│   ├── controllers/
│   │   └── dataController.js       # Business logic
│   └── server.js                   # Main server file
│
├── client/                          # Frontend
│   ├── index.html                  # Landing page
│   ├── dashboard.html              # Dashboard page
│   ├── css/
│   │   └── styles.css             # All styling
│   └── js/
│       ├── main.js                 # Landing page logic
│       └── dashboard.js            # Dashboard logic
│
├── main_code.ino                    # Arduino firmware
├── package.json                     # Node.js dependencies
├── .env.example                     # Environment template
├── README.md                        # This file
└── start.sh                         # Server startup script

```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v14.0 or higher)
   - Download: https://nodejs.org/
   - Check: `node -v`

2. **MongoDB** (Local or Atlas)
   - Local: Download from https://www.mongodb.com/try/download/community
   - Cloud: Atlas at https://www.mongodb.com/cloud/atlas
   - Check: `mongod` runs successfully

3. **Arduino IDE** (For uploading firmware)
   - Download: https://www.arduino.cc/en/software
   - Required libraries:
     - Wire
     - LiquidCrystal_I2C
     - Adafruit_ADXL345
     - TinyGPS++
     - MAX30105
     - ArduinoJson
     - WiFiC3

4. **Hardware Components**
   - Arduino UNO R4 WiFi
   - MAX30102 sensor
   - ADXL345 accelerometer
   - LM35 temperature sensor
   - NEO-6M GPS module
   - I2C 16x2 LCD display
   - Breadboard and jumper wires
   - USB cable for Arduino

---

## 🚀 Installation Guide

### Step 1: Clone or Download the Project

```bash
# Navigate to your projects directory
cd "c:\Users\Acer\Desktop\study material\SEM-4\1. IIOT & Robotics\Projects\main_code"
```

### Step 2: Install Node.js Dependencies

```bash
# Install all backend dependencies
npm install

# Output should show:
# ✓ express
# ✓ mongoose
# ✓ cors
# ✓ body-parser
# ✓ dotenv
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your settings
# Update MONGODB_URI if using Atlas or different MongoDB setup
```

### Step 4: Start MongoDB

**Option A: Local MongoDB**
```bash
# On Windows (in MongoDB installation folder)
mongod

# On macOS (with Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### Step 5: Configure Arduino Firmware

1. Open `main_code.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_SSID";           // Your WiFi network
   const char* password = "YOUR_PASSWORD";  // Your WiFi password
   const char* serverAddress = "192.168.x.x"; // Your PC's IP address
   ```
3. Install required libraries (Sketch → Include Library → Manage Libraries)
4. Select board: Tools → Board → Arduino UNO R4 WiFi
5. Select port: Tools → Port → COMx (your Arduino port)
6. Click Upload (Ctrl + U)

---

## ⚙️ Configuration

### MongoDB URI Configuration

**Local MongoDB:**
```
MONGODB_URI=mongodb://localhost:27017/elderly-health-monitoring
```

**MongoDB Atlas (Cloud):**
```
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/elderly-health-monitoring?retryWrites=true&w=majority
```

### Server Port Configuration

```bash
# In .env file
PORT=5000  # Default port

# Or override when running
PORT=3000 npm start
```

### Arduino Network Configuration

Update these in `main_code.ino`:
```cpp
const char* ssid = "YOUR_SSID";              // WiFi network name
const char* password = "YOUR_PASSWORD";      // WiFi password
const char* serverAddress = "192.168.1.100"; // PC IP address
const int serverPort = 5000;                 // Server port
```

Find your PC's IP address:
- **Windows:** `ipconfig` (look for IPv4 Address)
- **macOS/Linux:** `ifconfig` (look for inet)

---

## ▶️ Running the Application

### Start the Server

**Option 1: Using npm**
```bash
npm start
# Server will run at http://localhost:5000
```

**Option 2: Using nodemon (auto-reload)**
```bash
npm run dev
# Server runs with auto-reload on file changes
```

**Option 3: Using the startup script**
```bash
# On Windows PowerShell
./start.sh

# On macOS/Linux
bash start.sh
```

### Access the Application

1. Open browser: http://localhost:5000
2. Click "Login" or "Explore Features"
3. Enter any username/password to access dashboard
4. View real-time health data as Arduino sends data

### Verify Server is Running

```bash
# Test server health endpoint
curl http://localhost:5000/health

# Expected response:
# {"success": true, "message": "Server is running", "timestamp": "2024-01-01T12:00:00Z"}
```

---

## 📡 API Endpoints

### 1. POST /api/data
Store incoming sensor data from Arduino

**Request:**
```json
{
  "temperature": 36.5,
  "bpm": 72,
  "spo2": 98,
  "fall": false,
  "lat": 28.6139,
  "lon": 77.2090,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data stored successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "temperature": 36.5,
    "bpm": 72,
    "spo2": 98,
    "fall": false,
    "lat": 28.6139,
    "lon": 77.2090,
    "timestamp": "2024-01-01T12:00:00Z",
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

---

### 2. GET /api/data/latest
Retrieve the most recent health data record

**Request:**
```
GET http://localhost:5000/api/data/latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "temperature": 36.5,
    "bpm": 72,
    "spo2": 98,
    "fall": false,
    "lat": 28.6139,
    "lon": 77.2090,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

### 3. GET /api/data/history
Retrieve historical data with pagination

**Request:**
```
GET http://localhost:5000/api/data/history?limit=50&skip=0
```

**Query Parameters:**
- `limit` (default: 50) - Number of records to fetch
- `skip` (default: 0) - Number of records to skip

**Response:**
```json
{
  "success": true,
  "data": [
    { /* health data object */ },
    { /* health data object */ }
  ],
  "pagination": {
    "total": 1000,
    "limit": 50,
    "skip": 0,
    "pages": 20
  }
}
```

---

### 4. GET /api/data/stats
Get health statistics for a time range

**Request:**
```
GET http://localhost:5000/api/data/stats?range=24h
```

**Query Parameters:**
- `range` - "24h", "7d", or "30d"

**Response:**
```json
{
  "success": true,
  "timeRange": "24h",
  "stats": {
    "avgTemperature": 36.8,
    "avgBpm": 75,
    "avgSpo2": 97,
    "maxTemperature": 37.5,
    "minTemperature": 35.8,
    "maxBpm": 95,
    "minBpm": 55,
    "maxSpo2": 100,
    "minSpo2": 95,
    "fallCount": 1,
    "totalRecords": 432
  }
}
```

---

### 5. GET /api/data/alerts
Retrieve fall detection alerts

**Request:**
```
GET http://localhost:5000/api/data/alerts?limit=20
```

**Query Parameters:**
- `limit` (default: 20) - Number of alerts to fetch

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "temperature": 36.5,
      "bpm": 72,
      "spo2": 98,
      "fall": true,
      "lat": 28.6139,
      "lon": 77.2090,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

### 6. DELETE /api/data/cleanup
Delete old records (for database maintenance)

**Request:**
```
DELETE http://localhost:5000/api/data/cleanup?days=30
```

**Query Parameters:**
- `days` (default: 30) - Keep data from last N days

**Response:**
```json
{
  "success": true,
  "message": "Deleted 100 old records",
  "deletedCount": 100
}
```

---

## 🔌 Arduino Integration

### Hardware Connections

```
Arduino Pin Configuration:
├── I2C (SDA, SCL) → MAX30102, ADXL345, LCD
├── A1 → LM35 Temperature Sensor
├── Pin 3 → GPS RX (SoftwareSerial)
├── Pin 4 → GPS TX (SoftwareSerial)
├── Pin 8 → Buzzer (Alert)
└── 5V, GND → Power distribution
```

### Firmware Features

The `main_code.ino` includes:

1. **WiFi Connectivity**
   - Automatic WiFi connection
   - Connection status on LCD display

2. **Sensor Reading**
   - Temperature from LM35 sensor
   - Heart rate from MAX30102
   - SpO2 from MAX30102
   - Acceleration from ADXL345

3. **Data Transmission**
   - HTTP POST to server every 2 seconds
   - JSON format payload
   - Error handling and retries

4. **Local Display**
   - LCD shows real-time values
   - Fall detection indicator
   - WiFi status

5. **Alert System**
   - Buzzer activation on fall
   - Serial logging for debugging

### Modifying WiFi Credentials

Edit these lines in `main_code.ino`:
```cpp
const char* ssid = "YOUR_SSID";           // Line 21
const char* password = "YOUR_PASSWORD";   // Line 22
const char* serverAddress = "192.168.x.x"; // Line 23
```

### Testing Arduino Connection

1. Open Serial Monitor in Arduino IDE (9600 baud)
2. Watch debug output:
   ```
   Temp: 36.5 | BPM: 72 | SpO2: 98 | Lat: 28.6139 | Lon: 77.2090
   ```

3. Verify data reaches server:
   ```bash
   curl http://localhost:5000/api/data/latest
   ```

---

## 📊 Database Schema

### HealthData Collection

```javascript
{
  "_id": ObjectId,              // Unique identifier
  "temperature": Number,        // °C (30-45)
  "bpm": Number,                // Beats per minute (0-200)
  "spo2": Number,               // Oxygen saturation percent (80-100)
  "fall": Boolean,              // Fall detected flag
  "lat": Number,                // Latitude (-90 to 90)
  "lon": Number,                // Longitude (-180 to 180)
  "timestamp": Date,            // When data was recorded
  "createdAt": Date,            // When created in DB
  "updatedAt": Date             // When last updated
}
```

### Index Configuration

- `timestamp` - Indexed for faster sorting and range queries
- Compound index on (fall, timestamp) for alert queries

---

## 📖 Usage Guide

### Landing Page

1. **Hero Section** - Project introduction
2. **Features** - Key capabilities overview
3. **About** - System architecture explanation
4. **Tech Stack** - Technology information
5. **Login Button** - Access dashboard

### Dashboard Page

#### Live Data Cards
- **Temperature Card** - Current body temperature
- **Heart Rate Card** - BPM with trend indicator
- **SpO2 Card** - Oxygen saturation level
- **Fall Detection Card** - Status and alerts

#### Charts
- **Temperature Trend** - Line chart over time
- **Heart Rate Trend** - BPM variations
- **SpO2 Trend** - Oxygen saturation changes
- **Combined View** - All metrics together

#### Location
- **GPS Coordinates** - Displayed latitude/longitude
- **Map** - Interactive Leaflet map with marker

#### Statistics
- **Average Values** - Last 24 hours averages
- **Fall Count** - Number of falls detected

#### Alerts
- **Recent Falls** - List of fall detection events
- **Timestamps** - When each fall occurred

---

## 🔧 Troubleshooting

### Arduino Doesn't Connect to WiFi

**Problem:** Arduino shows "WiFi FAIL" on LCD

**Solutions:**
1. Check WiFi credentials in code
2. Verify WiFi network is available
3. Ensure Arduino has WiFi capability (UNO R4 WiFi)
4. Check antenna connection
5. Move closer to router

### Server Not Starting

**Problem:** `npm start` shows error

**Solutions:**
```bash
# Check Node.js installation
node -v

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check port availability
netstat -an | grep 5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Use different port
PORT=3000 npm start
```

### MongoDB Connection Error

**Problem:** Cannot connect to MongoDB

**Solutions:**
```bash
# Check MongoDB is running
mongod

# Verify connection string
# Local: mongodb://localhost:27017/elderly-health-monitoring
# Atlas: mongodb+srv://user:password@cluster0.mongodb.net/db

# Test connection
mongosh mongodb://localhost:27017
```

### Arduino Code Upload Fails

**Problem:** "Failed to upload" error

**Solutions:**
1. Check correct board selected (Arduino UNO R4 WiFi)
2. Verify correct COM port
3. Unplug and reconnect Arduino
4. Check USB cable
5. Disable antivirus temporarily

### Dashboard Shows "No Data"

**Problem:** Dashboard loading but no data appears

**Solutions:**
1. Ensure Arduino is sending data
2. Check Serial Monitor output
3. Verify server is receiving POST requests:
   ```bash
   curl http://localhost:5000/api/data/latest
   ```
4. Check MongoDB has data:
   ```bash
   mongosh
   use elderly-health-monitoring
   db.healthdatas.find()
   ```

### Charts Not Displaying

**Problem:** Chart containers are empty

**Solutions:**
1. Check browser console for JavaScript errors (F12)
2. Ensure Chart.js library loads: `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try different browser

### Map Not Loading

**Problem:** Map area is blank

**Solutions:**
1. Check Leaflet.js library loads properly
2. Verify GPS coordinates are valid
3. Check browser console for errors
4. Ensure localStorage is enabled

---

## Future Improvements

1. **Advanced Analytics**
   - Machine learning for anomaly detection
   - Predictive health alerts
   - Statistical trend analysis

2. **Multi-User Support**
   - Family member accounts
   - Role-based access control
   - User authentication with JWT

3. **Notification System**
   - SMS alerts via Twilio
   - Email notifications
   - Push notifications for mobile

4. **Mobile App**
   - React Native application
   - Offline data sync
   - Push notifications

5. **Integration**
   - Integration with hospitals
   - Emergency services API
   - Wearable device support

6. **Enhanced Security**
   - End-to-end encryption
   - Two-factor authentication
   - HIPAA compliance
   - GDPR compliance

7. **Data Export**
   - PDF report generation
   - CSV export functionality
   - Print-friendly views

8. **Multiple Patients**
   - Support multiple elderly users
   - Separate dashboards
   - Comparative analytics

### Scalability Improvements

- Database optimization for large datasets
- Redis caching for frequently accessed data
- CDN for static assets
- Load balancing for multiple servers
- Containerization with Docker
- Kubernetes deployment

---

## 🤝 Contributing

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request


---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👤 Authors

- **Project Team** - RAJ RATHAUR(Team Leader), Maneesh, Rohit, Ashutosh , Vivek, and Ram
- **Institution** - SEM 4, IoT & Robotics
- **Year** - 2026

---

## Resources

- **Arduino Documentation:** https://www.arduino.cc/reference/en/
- **Node.js Guide:** https://nodejs.org/en/docs/
- **MongoDB Manual:** https://docs.mongodb.com/manual/
- **Express.js Documentation:** https://expressjs.com/
- **Chart.js Guide:** https://www.chartjs.org/docs/latest/
- **Leaflet.js Documentation:** https://leafletjs.com/reference.html

---


## 🎉 Getting Started

Quick start command:
```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB
mongod  # or appropriate command for your system

# 3. Start server
npm start

# 4. Access dashboard
# Open browser to: http://localhost:5000
```

---


**Happy Monitoring! ❤️**

For the safety and well-being of our elderly loved ones.