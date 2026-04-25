# Arduino Setup & Configuration Guide

This guide provides detailed instructions for setting up and configuring the Arduino UNO R4 WiFi for the Elderly Health Monitoring System.

---

## 📋 Hardware Requirements

### Components Needed

| Component | Model | Purpose | Quantity |
|-----------|-------|---------|----------|
| Microcontroller | Arduino UNO R4 WiFi | Main controller | 1 |
| Pulse Sensor | MAX30102 | Heart rate & SpO2 | 1 |
| Accelerometer | ADXL345 | Fall detection | 1 |
| Temperature | LM35 | Body temperature | 1 |
| GPS Module | NEO-6M | Location tracking | 1 |
| LCD Display | 16x2 I2C LCD | Local display | 1 |
| Buzzer | 5V Buzzer | Alert sound | 1 |
| Power Supply | 5V USB | Power | 1 |
| Jumper Wires | M-M, M-F | Connections | 20+ |
| Breadboard | Large | Prototyping | 1 |

---

## 🔌 Pin Configuration

### Arduino UNO R4 WiFi Pin Mapping

```
┌─────────────────────────────────────────┐
│      Arduino UNO R4 WiFi                │
├─────────────────────────────────────────┤
│ Digital Pins (0-13)                     │
│ ├─ Pin 3  → GPS TX (SoftwareSerial)    │
│ ├─ Pin 4  → GPS RX (SoftwareSerial)    │
│ └─ Pin 8  → Buzzer                     │
│                                         │
│ Analog Pins (A0-A5)                    │
│ ├─ A1  → LM35 Temperature Sensor       │
│ └─ A4, A5 → I2C (SDA, SCL)            │
│                                         │
│ I2C Devices (Pins A4, A5)              │
│ ├─ MAX30102 (Heart rate & SpO2)        │
│ ├─ ADXL345 (Accelerometer)              │
│ └─ LCD 16x2 I2C (0x27)                 │
│                                         │
│ Power Pins                              │
│ ├─ 5V   → All sensors & components     │
│ └─ GND  → All ground connections       │
└─────────────────────────────────────────┘
```

---

## 🛠 Wiring Diagram Template

## MAX30102 (Heart Rate & SpO2 Sensor)

```
MAX30102
├─ VCC   → Arduino 5V
├─ GND   → Arduino GND
├─ SDA   → Arduino A4 (I2C)
└─ SCL   → Arduino A5 (I2C)
```

### ADXL345 (Accelerometer)

```
ADXL345
├─ VCC   → Arduino 3.3V
├─ CS    → Arduino 3.3V
├─ GND   → Arduino GND
├─ VCC   → Arduino GND
├─ SDA   → Arduino A4 (I2C)
└─ SCL   → Arduino A5 (I2C)
```

### LM35 (Temperature Sensor)

```
LM35
├─ +Vs   → Arduino 5V
├─ Vout  → Arduino A1 (Analog)
└─ GND   → Arduino GND
```

### NEO-6M (GPS Module)

```
NEO-6M
├─ VCC   → Arduino 5V
├─ GND   → Arduino GND
├─ RX    → Arduino Pin ~3 (SoftwareSerial TX)
└─ TX    → Arduino Pin  4 (SoftwareSerial RX)
```


### Buzzer

```
5V Buzzer
├─ +     → Arduino Pin 8 (via current limiting resistor)
└─ -     → Arduino GND
```

---

## 💾 Required Libraries

### Installation Steps

1. Open Arduino IDE
2. Go to **Sketch** → **Include Library** → **Manage Libraries**
3. Search for and install each library:

### Library List

| Library           | Author         | Purpose              |
|-------------------|----------------|----------------------|
| Wire              | Arduino        | I2C communication    |
| LiquidCrystal_I2C | Marco Schwartz | LCD display control  |
| Adafruit_ADXL345  | Adafruit       | Accelerometer driver |
| TinyGPS++         | Mikal Hart     | GPS parsing          |
| MAX30105          | Sparkfun       | Pulse sensor driver  |
| ArduinoJson       | Benoît Blanchon| JSON serialization   |
| WiFiC3            | Arduino        | WiFi connectivity    |

### Install Commands (Advanced)

```bash
# Using Arduino CLI (if installed)
arduino-cli lib install "Adafruit ADXL345"
arduino-cli lib install "TinyGPS++"
arduino-cli lib install "MAX30105"
arduino-cli lib install "LiquidCrystal I2C"
arduino-cli lib install "ArduinoJson"
```

---

## ⚙️ Software Configuration

### Step 1: Update WiFi Credentials

Edit `main_code.ino` lines 10-13:

```cpp
const char* ssid = "YOUR_SSID";              // Your WiFi network
const char* password = "YOUR_PASSWORD";      // Your WiFi password
const char* serverAddress = "192.168.1.100"; // Your PC/Server IP
const int serverPort = 5000;                 // Server port
```

### Finding Your PC's IP Address

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your active connection
# Example: 192.168.1.100
```

**macOS/Linux:**
```bash
ifconfig
# Look for "inet" (not inet6)
# Example: inet 192.168.1.100
```

### Step 2: Configure Sensor Parameters

If needed, adjust sensor thresholds:

```cpp
// Temperature Sensor Calibration
// If readings are consistently off, adjust multiplier:
temperature = voltage * 100.0;  // Adjust 100.0 multiplier

// Fall Detection Threshold
// Adjust the acceleration threshold (currently 20 m/s²):
if (totalAccel > 20) {  // Lower = more sensitive, Higher = less sensitive
  fallDetected = true;
}

// SpO2 Mapping Range
// Adjust based on specific MAX30102 calibration:
spo2 = map(irValue, 50000, 100000, 90, 100); // Adjust ranges
```

### Step 3: Board & Port Selection

1. **Select Board:**
   - Tools → Board → Arduino UNO R4 WiFi

2. **Select Port:**
   - Tools → Port → COMx (Windows) or /dev/cu.usbmodem... (macOS)

3. **Select Programmer:**
   - Tools → Programmer → AVRISP mkII

---

## 📤 Uploading Code

### Method 1: Arduino IDE

1. Open `main_code.ino` in Arduino IDE
2. Click **Verify** button (→|) to check for errors
3. Click **Upload** button (→) to upload code
4. Wait for upload to complete
5. Check Serial Monitor for debug output

### Method 2: Command Line (Arduino CLI)

```bash
# Compile
arduino-cli compile --fqbn arduino:megaavr:uno_r4_wifi main_code.ino

# Upload
arduino-cli upload -p COM3 --fqbn arduino:megaavr:uno_r4_wifi main_code.ino
```

---

## 🧪 Testing & Verification

### Test 1: Serial Communication

1. Open Serial Monitor (Tools → Serial Monitor or Ctrl+Shift+M)
2. Set baud rate to 9600
3. Should see debug output:
   ```
   Temp: 36.5 | BPM: 72 | SpO2: 98 | Lat: 28.6139 | Lon: 77.2090
   ```

### Test 2: LCD Display

Expected LCD output:
```
Line 1: BPM:72 SpO2:98%
Line 2: T:36.5C
```

### Test 3: WiFi Connection

Serial Monitor output:
```
WiFi Connected!
IP: 192.168.1.105
```

### Test 4: Server Communication

Verify data reaches server:
```bash
curl http://localhost:5000/api/data/latest
```

Should return latest sensor data.

### Test 5: Fall Detection

1. Move sensor rapidly or tilt sharply
2. Check for:
   - Serial output: `FALL ALERT!`
   - Buzzer sound
   - Dashboard alert

---

## 🐛 Debugging

### Enable Serial Debug Output

Already enabled in code with:
```cpp
Serial.print("Temp: ");
Serial.println(temperature);
```

Check Serial Monitor (9600 baud) for output.

### Common Issues

#### Issue: No Data in Serial Monitor
- **Solution:** Check USB cable connection
- **Solution:** Verify correct COM port selected
- **Solution:** Restart Arduino IDE

#### Issue: WiFi Won't Connect
- **Solution:** Verify SSID and password are correct (case-sensitive)
- **Solution:** Check WiFi signal strength
- **Solution:** Move closer to router
- **Solution:** Verify Arduino UNO R4 WiFi (not regular UNO)

#### Issue: Sensor Not Responding
In Serial Monitor:
```
ADXL345 error
```
- **Solution:** Check I2C connections (SDA/SCL)
- **Solution:** Verify addresses match (0x53 for ADXL345)
- **Solution:** Check power supply (5V)

#### Issue: Temperature Reading Wrong
- Verify LM35 is connected to A1
- Check voltage calculation:
  ```cpp
  float voltage = analogValue * (5.0 / 1023.0);
  temperature = voltage * 100.0;
  ```
- Calibrate with known temperature

#### Issue: GPS Not Working
- Ensure GPS module is receiving power
- Check TX/RX connections (may need to swap)
- Requires open sky for satellite signal
- Wait 30+ seconds for first fix

---

## 📊 Sensor Specifications

### MAX30102 (Heart Rate & SpO2)

- **I2C Address:** 0x57
- **I2C Speed:** 400kHz
- **Operating Voltage:** 4.5-5.5V
- **Current:** ~11mA (typical)
- **Heart Rate Range:** 0-255 BPM
- **SpO2 Range:** 80-100%
- **Sampling Rate:** 100Hz (default)

### ADXL345 (Accelerometer)

- **I2C Address:** 0x53
- **Operating Voltage:** 2.0-3.6V (onboard regulator)
- **Measurement Range:** ±16g (default)
- **Sensitivity:** 3.9mg/LSB
- **Bandwidth:** 0.39-400Hz (configurable)

### LM35 Temperature Sensor

- **Temperature Range:** -40 to +150°C
- **Output Accuracy:** ±0.5°C
- **Linearity:** 10mV/°C
- **Operating Voltage:** 4-30V
- **Current:** ~0.5-1mA

### NEO-6M GPS Module

- **Protocol:** NMEA
- **Baud Rate:** 9600
- **Accuracy:** ±2.5m (horizontal)
- **Acquisition:** Cold start ~25s, Warm start ~5s
- **Satellites:** 50+ channels
- **Operating Voltage:** 3.3-5V

---

## 🔄 Data Format

### JSON Payload Sent to Server

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

### HTTP POST Request

```
POST /api/data HTTP/1.1
Host: 192.168.1.100:5000
Content-Type: application/json
Content-Length: 123

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

---

## 🚀 Performance Tips

### Improve Accuracy

1. **Temperature:** Use a calibrated thermometer nearby to adjust multiplier
2. **Heart Rate:** Keep sensor pressed gently against skin
3. **SpO2:** Similar to heart rate - proper contact is essential
4. **Fall Detection:** Adjust threshold based on testing
5. **GPS:** Ensure open sky visibility

### Reduce Power Consumption

- Increase data posting interval (>2 seconds)
- Reduce LCD refresh rate
- Use sleep modes when inactive
- Disconnect unused sensors

### Improve WiFi Stability

- Use 2.4GHz WiFi (not 5GHz)
- Move closer to router
- Reduce interference from other devices
- Use WiFi 5 or 6 capable routers

---

## 📚 Additional Resources

- **Arduino Documentation:** https://docs.arduino.cc/
- **MAX30102 Datasheet:** https://datasheets.maximintegrated.com/
- **ADXL345 Datasheet:** https://www.analog.com/
- **NEO-6M Documentation:** https://www.u-blox.com/
- **Arduino Forums:** https://forum.arduino.cc/

---

## ✅ Checklist

- [ ] All components obtained
- [ ] Pin connections verified
- [ ] Libraries installed
- [ ] WiFi credentials updated
- [ ] Board and port selected
- [ ] Code uploaded successfully
- [ ] Serial output visible
- [ ] WiFi connected
- [ ] Server receiving data
- [ ] Fall detection tested
- [ ] GPS getting signal

                                                                              LU:25.04.26
