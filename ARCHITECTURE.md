# System Architecture Documentation

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Elderly Health Monitoring System              │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────▼───┐  ┌──────▼───┐  ┌──────▼───┐
         │ Arduino   │  │   Web    │  │ Database │
         │ UNO R4    │  │ Dashboard│  │ MongoDB  │
         │ (Sensors) │  │  & API   │  │          │
         └──────┬────┘  └──────┬────┘  └──────┬───┘
                │             │              │
                └──────┬──────┴──────┬───────┘
                       │            │
                   HTTP POST    Database
                   Requests     Queries
```

---

## 🔌 Component Overview

### 1. Arduino Hardware Layer

**Arduino UNO R4 WiFi**
- Microcontroller: SAMD21G18A
- WiFi: Connectivity module
- I2C Bus: Multi-sensor communication
- SoftwareSerial: GPS communication
- Analog Input: Temperature sensor reading

**Sensors Connected:**
```
I2C Devices (Parallel)
├─ MAX30102 (Address: 0x57)
│  └─ Measures: Heart Rate (BPM), Oxygen Saturation (SpO2)
└─ ADXL345 (Address: 0x53)
   └─ Measures: Acceleration (Fall Detection)

Serial Devices
├─ GPS Module (SoftwareSerial pins 3,4)
│  └─ Provides: Latitude, Longitude, Altitude
└─ Serial Monitor (USB)
   └─ Debug output

Analog Devices
├─ LM35 Temperature Sensor (A1)
│  └─ Measures: Body Temperature in °C
└─ Buzzer (Pin 8)
   └─ Alerts: Fall detection

```

### 2. Network Layer

**Communication Flow:**
```
Arduino (WiFi) 
    │
    ├─ Connects to: WiFi Network (2.4GHz)
    │
    ├─ Performs DNS Resolution
    │
    ├─ Establishes TCP Connection
    │   └─ Target: Server IP:Port (e.g., 192.168.1.100:5000)
    │
    └─ Sends HTTP POST Request
        └─ Payload: JSON with sensor data
```

**Data Transmission:**
- **Protocol:** HTTP/1.1
- **Method:** POST
- **Content-Type:** application/json
- **Frequency:** Every 2 seconds
- **Payload Size:** ~150 bytes

### 3. Backend Architecture (Node.js + Express)

```
┌─────────────────────────────────────────────────────────┐
│                    Express.js Server                    │
│                      (Port 5000)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Request Handling Layer                                 │
│  ├─ CORS Middleware              (Allow cross-origin)   │
│  ├─ Body Parser                  (JSON parsing)         │
│  ├─ Static File Server           (HTML, CSS, JS)        │
│  └─ Error Handler                (Exception handling)   │
│                                                         │
│  Routing Layer                                          │
│  ├─ POST /api/data               (Store sensor data)    │
│  ├─ GET  /api/data/latest        (Latest record)        │
│  ├─ GET  /api/data/history       (Historical data)      │
│  ├─ GET  /api/data/stats         (Statistics)           │
│  ├─ GET  /api/data/alerts        (Fall alerts)          │
│  └─ DELETE /api/data/cleanup     (Data maintenance)     │
│                                                         │
│  Controller Layer (Business Logic)                      │
│  ├─ Data Validation              (Check ranges)         │
│  ├─ Fall Detection Processing    (Alert processing)     │
│  ├─ Aggregation Functions        (Stats calculation)    │
│  └─ Error Handling               (Try-catch blocks)     │
│                                                         │
│  Data Access Layer (Mongoose)                           │
│  ├─ Query Building               (MongoDB queries)      │
│  ├─ Schema Validation            (Data structure)       │
│  └─ Indexing                     (Performance)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                          │
         │ MongoDB Driver           │
         │                          │
    ┌────▼──────────────────────────▼────┐
    │      MongoDB Database (Local)      │
    │      elderly-health-monitoring     │
    └────────────────────────────────────┘
```

### 4. Frontend Architecture

```
┌──────────────────────────────────────┐
│         Web Browser (Client)         │
├──────────────────────────────────────┤
│                                      │
│  DOM Layer                           │
│  ├─ Landing Page (index.html)        │
│  │  └─ Hero, Features, About         │
│  └─ Dashboard (dashboard.html)       │
│     ├─ Live Data Cards               │
│     ├─ Charts Container              │
│     ├─ Location Map                  │
│     ├─ Statistics                    │
│     └─ Alerts Section                │
│                                      │
│  Styling Layer (CSS)                 │
│  ├─ Responsive Grid Layout           │
│  ├─ Animations & Transitions         │
│  ├─ Color Scheme                     │
│  └─ Mobile Optimization              │
│                                      │
│  JavaScript Layer                    │
│  ├─ main.js (Landing page)           │
│  │  ├─ Modal handling                │
│  │  └─ Login logic                   │
│  │                                   │
│  └─ dashboard.js (Dashboard)         │
│     ├─ API Communication             │
│     ├─ Data Processing               │
│     ├─ Chart Updates                 │
│     ├─ Map Rendering                 │
│     └─ Real-time Refresh             │
│                                      │
│  Libraries                           │
│  ├─ Chart.js 3.9 (Charting)          │
│  └─ Leaflet.js 1.9 (Mapping)         │
│                                      │
└──────────────────────────────────────┘
         │
         │ Fetch API
         │ (fetch())
         │
    ┌────▼──────────────┐
    │  Backend Server   │
    │  (Express.js)     │
    └───────────────────┘
```

---

## 📊 Data Flow Diagram

### Real-Time Data Collection & Display

```
Arduino Hardware Sensors
├─ MAX30102
│  └─ Reads: Heart rate, SpO2
├─ ADXL345
│  └─ Reads: Acceleration (fall detection)
├─ LM35
│  └─ Reads: Temperature
└─ GPS Module
   └─ Reads: Latitude, Longitude

    ▼

Sensor Data Processing
├─ Analog-to-Digital Conversion
├─ Sensor Calibration
├─ Threshold Checking
└─ JSON Serialization

    ▼

WiFi Transmission
├─ TCP Connection to Server
├─ HTTP POST Request
└─ Confirmation Reply

    ▼

Server Reception
├─ Request Parsing
├─ Data Validation
├─ Schema Verification
└─ Alert Detection (fall = true)

    ▼

Database Storage
├─ Insert into healthdatas collection
├─ Index by timestamp
└─ Store metadata (createdAt, updatedAt)

    ▼

Client-Side Polling (every 2 seconds)
├─ Fetch /api/data/latest
├─ Fetch /api/data/history
└─ Fetch /api/data/stats

    ▼

Dashboard Update
├─ Update Live Cards
│  ├─ Temperature Display
│  ├─ Heart Rate Display
│  ├─ SpO2 Display
│  └─ Fall Status
├─ Render Charts
│  ├─ Temperature Chart
│  ├─ BPM Chart
│  ├─ SpO2 Chart
│  └─ Combined Chart
├─ Update Location
│  ├─ Coordinates Display
│  └─ Map Marker
└─ Display Statistics
   ├─ Average Values
   └─ Other Metrics
```

---

## 🗄️ Database Schema & Relationships

### MongoDB Collection Structure

```javascript
// healthdatas collection
db.healthdatas = [
  {
    _id: ObjectId("507f1f77bcf86cd799439011"),
    temperature: 36.5,      // Number (°C)
    bpm: 72,               // Number
    spo2: 98,              // Number (%)
    fall: false,           // Boolean
    lat: 28.6139,          // Number
    lon: 77.2090,          // Number
    timestamp: ISODate("2024-01-01T12:00:00Z"),
    createdAt: ISODate("2024-01-01T12:00:00Z"),
    updatedAt: ISODate("2024-01-01T12:00:00Z"),
    __v: 0
  }
]
```

### Indexes

```javascript
// Performance Indexes
db.healthdatas.createIndex({ timestamp: -1 })        // Sort by recent
db.healthdatas.createIndex({ fall: 1, timestamp: -1 }) // Fall alerts
db.healthdatas.createIndex({ createdAt: -1 })       // Cleanup queries
```

### Query Examples

```javascript
// Get latest data
db.healthdatas.findOne({}, { sort: { timestamp: -1 } })

// Get fall alerts
db.healthdatas.find({ fall: true }).sort({ timestamp: -1 })

// Get last 24 hours
db.healthdatas.find({
  timestamp: { $gte: new Date(new Date() - 24*60*60*1000) }
})

// Calculate statistics
db.healthdatas.aggregate([
  { $match: { timestamp: { $gte: new Date(...) } } },
  { $group: {
    _id: null,
    avgTemp: { $avg: "$temperature" },
    avgBpm: { $avg: "$bpm" },
    avgSpo2: { $avg: "$spo2" },
    fallCount: { $sum: { $cond: ["$fall", 1, 0] } }
  }}
])
```

---

## 🔐 Security Architecture

### Data Validation Flow

```
Input (Arduino) ──▶ Validation ──▶ Type Check ──▶ Range Check ──▶ DB Storage
  JSON Payload      Schema          Numbers        Min/Max Values
                    Verify          Strings        Domain Rules
```

### Input Validation Rules

```javascript
// Temperature Validation
30 ≤ temperature ≤ 45 (°C range for humans)

// BPM Validation
0 ≤ bpm ≤ 200 (valid heart rate range)

// SpO2 Validation
80 ≤ spo2 ≤ 100 (blood oxygen percentage)

// Location Validation
-90 ≤ lat ≤ 90 (latitude boundaries)
-180 ≤ lon ≤ 180 (longitude boundaries)

// Fall Validation
fall ∈ {true, false} (boolean only)
```

---

## 🚀 Deployment Architecture

### Development Environment
```
Local Machine
├─ Arduino (USB connected)
├─ Node.js Server (localhost:5000)
├─ MongoDB (localhost:27017)
└─ Browser (localhost:5000)
```

### Production Environment (Future)
```
Cloud Infrastructure
├─ Arduino (WiFi to Internet)
├─ Cloud Server (AWS EC2, Heroku, etc.)
├─ Database (MongoDB Atlas)
├─ CDN (Static files, images)
└─ Analytics (Monitoring, logging)
```

---

## 📈 System Scalability

### Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Data Points/Day | ~43,200 | 2-sec interval |
| Device Limit | 10-50 | Per server |
| Query Latency | <100ms | For latest data |
| Throughput | ~10 req/s | Per server |
| Database Size | ~100MB/month | Per device |

### Scaling Strategy

1. **Database Optimization**
   - Add more indexes
   - Implement sharding
   - Use aggregation pipeline

2. **Horizontal Scaling**
   - Multiple Node.js instances
   - Load balancer (nginx, HAProxy)
   - Database replication

3. **Caching Layer**
   - Redis for frequent queries
   - Session storage
   - API response caching

4. **CDN & Static Assets**
   - CloudFlare for static files
   - Image optimization
   - Global distribution

---

## 🔄 Deployment Pipeline

```
Development
    │
    ▼ (Commit & Push)
    
Version Control (Git)
    │
    ▼ (CI/CD Trigger)
    
Automated Testing
    ├─ Unit Tests
    ├─ Integration Tests
    └─ E2E Tests
    │
    ▼ (Tests Pass)
    
Build Process
    ├─ Minification
    ├─ Bundle Optimization
    └─ Docker Image Build
    │
    ▼ (Approval)
    
Staging Environment
    ├─ Smoke Tests
    ├─ Performance Tests
    └─ Security Scan
    │
    ▼ (Verified)
    
Production Deployment
    ├─ Blue-Green Deployment
    ├─ Health Checks
    └─ Rollback Plan
```

---

## 📊 System Monitoring

### Key Metrics to Monitor

```
Server Metrics
├─ CPU Usage (target: <70%)
├─ Memory Usage (target: <80%)
├─ Disk I/O (target: <60%)
└─ Network Bandwidth

Database Metrics
├─ Query Performance (target: <100ms)
├─ Replication Lag (target: <1s)
├─ Storage Growth (monitor trends)
└─ Connection Count

Application Metrics
├─ Request Success Rate (target: >99%)
├─ API Response Time (target: <200ms)
├─ Error Rate (target: <1%)
└─ Data Validation Success

Sensor Metrics
├─ Arduino Connection Status
├─ Data Transmission Frequency
├─ Data Quality (within valid ranges)
└─ Sensor Accuracy
```

---

## 🛡️ Reliability & Failover

### Failure Points & Recovery

```
Arduino Disconnects
    ├─ Server marks as offline
    ├─ Last known location retained
    └─ Alert sent to caregivers

Database Unavailable
    ├─ Server returns 503 error
    ├─ Client shows offline message
    └─ Automatic reconnect (60s interval)

Server Crash
    ├─ Restart process via systemd/PM2
    ├─ Check logs for root cause
    └─ Notify administrators

Network Failure
    ├─ Arduino queues data locally (future)
    ├─ Sync when connection restored
    └─ Timestamp verification
```

---

## 🔗 API Communication Flow

### Request-Response Example

```
┌─────────────────────┐
│  Arduino            │
│  (Sensor Data Up)   │
└──────────┬──────────┘
           │
           │ 1. HTTP POST /api/data
           │    Content-Type: application/json
           │
           ▼
┌─────────────────────────────────────┐
│  Express Server                     │
│  ├─ Parse JSON body                 │
│  ├─ Validate data                   │
│  ├─ Check schema                    │
│  ├─ Store in database               │
│  └─ Generate response               │
└──────────┬──────────────────────────┘
           │
           │ 2. HTTP 201 Created
           │    {"success": true, "data": {...}}
           │
           ▼
┌─────────────────────┐
│  Arduino            │
│  (Acknowledge)      │
└─────────────────────┘
           │
           │
           ▼
┌─────────────────────┐
│  Web Browser        │
│  (Polling)          │
└──────────┬──────────┘
           │
           │ 3. fetch(/api/data/latest)
           │
           ▼
┌─────────────────────────────────────┐
│  Express Server                     │
│  ├─ Query database                  │
│  ├─ Find latest record              │
│  └─ Return JSON response            │
└──────────┬──────────────────────────┘
           │
           │ 4. HTTP 200 OK
           │    {"success": true, "data": {...}}
           │
           ▼
┌─────────────────────┐
│  Web Browser        │
│  ├─ Update DOM      │
│  ├─ Render charts   │
│  └─ Refresh view    │
└─────────────────────┘
```

---

## 🎯 System Constraints & Assumptions

### Assumptions

1. Arduino remains powered and connected to WiFi
2. WiFi network is stable and reachable
3. Server has continuous internet connectivity
4. MongoDB is always available
5. Users have modern browsers with JavaScript enabled
6. GPS has clear sky visibility (may take 30+ seconds first fix)
7. Sensors are properly calibrated

### Constraints

1. **Network Latency** - WiFi may cause 100-500ms delays
2. **GPS Accuracy** - ±2-10 meters typical
3. **Sensor Accuracy** - ±0.5-1°C for temperature
4. **Scalability** - Single server supports ~50 simultaneous devices
5. **Storage** - Long-term data needs cleanup (>30 days retention)

---

## 📚 Reference Documents

- [README.md](README.md) - Overall project guide
- [ARDUINO_SETUP.md](ARDUINO_SETUP.md) - Hardware setup
- [API Endpoints Documentation](README.md#-api-endpoints)
- [Database Schema](README.md#-database-schema)

---
LU:25.04.2026