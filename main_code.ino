// Wire.h must be included FIRST so its I2C_BUFFER_LENGTH (255) wins over
// the SparkFun library's conflicting definition (32).
#include <Wire.h>

// Suppress the SparkFun MAX3010x I2C_BUFFER_LENGTH redefinition warning.
#ifdef I2C_BUFFER_LENGTH
  #undef I2C_BUFFER_LENGTH
#endif
#define I2C_BUFFER_LENGTH 255   // keep Renesas Wire.h value

#include <LiquidCrystal_I2C.h>
#include <TinyGPS++.h>
#include <SoftwareSerial.h>
#include <WiFiS3.h>
#include <ArduinoJson.h>
#include <heartRate.h>
#include <MAX30105.h>
#include <spo2_algorithm.h>

// ============ WiFi Configuration ============
const char* ssid           = "JR511";
const char* password       = "83309649";
const char* serverAddress  = "192.168.1.106";
const int   serverPort     = 5000;
const uint8_t SERVER_CONNECT_RETRIES = 3;

// ============ LCD Configuration ============
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ============ Sensors ============
TinyGPSPlus gps;
// GPS NEO-6M: RX pin of GPS -> TX(3) on board, TX pin of GPS -> RX(4) on board
SoftwareSerial gpsSerial(4, 3);   // Arduino RX=pin4 <-- GPS TX, Arduino TX=pin3 --> GPS RX
MAX30105 particleSensor;

// ============ Pins ============
#define BUZZER   8
#define TEMP_PIN A1    // LM335: Output -> A1, VCC -> 5V, GND -> GND

// ============ Timing (Non-blocking) ============
const unsigned long SENSOR_UPDATE_MS = 120;
const unsigned long LCD_UPDATE_MS    = 450;
const unsigned long SEND_INTERVAL_MS = 2000;
const unsigned long DEBUG_PRINT_MS   = 2000;
const unsigned long WIFI_RETRY_MS    = 10000;
const unsigned long BUZZER_ON_MS     = 180;

// ============ LM335 Temperature Configuration ============
// LM335 outputs 10 mV per Kelvin. With 5V reference and 10-bit ADC:
//   voltage = (ADC / 1023) * 5.0
//   tempK   = voltage * 100           (10mV/K -> 1V = 100K)
//   tempC   = tempK - 273.15
// Formula used in code: temperature = (voltage * 100) - 273.15
const bool  TEMP_SENSOR_IS_LM335 = true;
const float TEMP_OFFSET_C        = 0.0f;   // Fine-tune after calibration if needed
const float TEMP_VALID_MIN_C     = 30.0f;
const float TEMP_VALID_MAX_C     = 45.0f;

// ============ BPM / SpO2 Validation Bounds ============
const int BPM_VALID_MIN  = 40;
const int BPM_VALID_MAX  = 180;
const int SPO2_VALID_MIN = 80;
const int SPO2_VALID_MAX = 100;

// ============ Fall Detection Thresholds ============
const float FREE_FALL_THRESHOLD_G = 0.55f;   // total-g below this → free fall suspected
const float IMPACT_THRESHOLD_G    = 1.85f;   // total-g above this after free fall → confirmed fall
const float MOTION_THRESHOLD_G    = 2.20f;   // fallback: sudden spike without prior free fall
const unsigned long IMPACT_WINDOW_MS = 1500; // max ms between free fall and impact
const unsigned long FALL_HOLD_MS     = 4000; // how long fallDetected stays true after event

// ============ Filter Windows ============
const uint8_t TEMP_WINDOW  = 7;
const uint8_t BPM_WINDOW   = 7;
const uint8_t SPO2_WINDOW  = 7;
const uint8_t MEDIAN_SCRATCH_SIZE = 7;  // must be >= largest window size

// ============ GPS Stabilization ============
const uint8_t GPS_STABLE_FIXES = 3;    // consecutive consistent fixes before trusting coords

// ============ MAX30102 Configuration ============
// The Maxim SpO2 algorithm requires exactly 100 samples for reliable output.
// We fill the full buffer before calling maxim_heart_rate_and_oxygen_saturation().
const uint8_t  MAX30102_SAMPLE_BUFFER  = 100;
const int      MAX30102_MIN_SIGNAL     = 50000;  // raised from 10000 — filters no-finger noise
const uint8_t  MAX30102_ALGO_MIN_SAMPLES = 100;  // must match buffer size for Maxim algo

// ============ State Variables (used by web API — DO NOT RENAME) ============
float temperature = 36.5f;
int   bpm         = 72;
int   spo2        = 95;
bool  fallDetected = false;
float latitude    = 28.6139f;
float longitude   = 77.2090f;
bool  gpsCoordinateValid = false;  // false until 3 stable GPS fixes are received

bool max30102Available = false;
bool adxlAvailable     = false;

WiFiClient client;
IPAddress serverIP;
bool serverIPValid = false;

// ============ Filter Buffers ============
float   tempBuffer[TEMP_WINDOW]  = {0};
float   bpmBuffer[BPM_WINDOW]    = {0};
float   spo2Buffer[SPO2_WINDOW]  = {0};
uint8_t tempCount = 0, bpmCount = 0, spo2Count = 0;
uint8_t tempIndex = 0, bpmIndex = 0, spo2Index = 0;

// ============ BPM / SpO2 Last Valid Values ============
int  lastValidBpm  = 72;
int  lastValidSpo2 = 95;
long lastBeat      = 0;

// ============ MAX30102 Sample Buffers ============
uint32_t irBuffer[MAX30102_SAMPLE_BUFFER];
uint32_t redBuffer[MAX30102_SAMPLE_BUFFER];
uint16_t bufferLength = 0;

// Shared MAX30102 internal state
static int           max30102RawIR         = 0;
static int           max30102RawRed        = 0;
static unsigned long max30102LastBeatTime  = 0;
static int           max30102AlgoHr        = 0;
static int           max30102AlgoSpo2      = 0;
static bool          max30102AlgoHrValid   = false;
static bool          max30102AlgoSpo2Valid = false;
static bool          max30102FingerPresent = false;

// ============ GPS Internal State ============
float   pendingLat     = 28.6139f;
float   pendingLon     = 77.2090f;
uint8_t gpsStableCount = 0;

// ============ Fall Detection Internal State ============
unsigned long freeFallDetectedAt = 0;
unsigned long fallDetectedAt     = 0;
bool    waitingForImpact    = false;
float   lastTotalG          = 1.0f;
uint8_t adxlReadFailCount   = 0;
unsigned long lastAdxlErrorPrint = 0;

// ============ ADXL345 Register Map ============
// Wiring: VCC->3.3V, CS->3.3V, SCL->SCL, SDA->SDA, GND->GND, SDO->GND => address 0x53
const uint8_t ADXL345_ADDR            = 0x53;
const uint8_t ADXL345_REG_DEVID       = 0x00;
const uint8_t ADXL345_REG_POWER_CTL   = 0x2D;
const uint8_t ADXL345_REG_DATA_FORMAT = 0x31;
const uint8_t ADXL345_REG_BW_RATE     = 0x2C;
const uint8_t ADXL345_REG_DATAX0      = 0x32;
const unsigned long ADXL_ERROR_PRINT_MS = 2000;

// ============ Buzzer State ============
bool          buzzerOn        = false;
unsigned long buzzerTurnOffAt = 0;

// ============ Scheduler Timestamps ============
unsigned long lastSensorUpdate = 0;
unsigned long lastLcdUpdate    = 0;
unsigned long lastSend         = 0;
unsigned long lastDebugPrint   = 0;
unsigned long lastWiFiRetry    = 0;

// ============================================================
// UTILITY HELPERS
// ============================================================

float clampFloat(float value, float minValue, float maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

bool isFiniteNumber(float value) {
  return !isnan(value) && !isinf(value);
}

void pushSample(float* buffer, uint8_t windowSize, float value,
                uint8_t& index, uint8_t& count) {
  buffer[index] = value;
  index = (index + 1) % windowSize;
  if (count < windowSize) count++;
}

float movingAverage(const float* buffer, uint8_t count) {
  if (count == 0) return 0.0f;
  float sum = 0.0f;
  for (uint8_t i = 0; i < count; i++) sum += buffer[i];
  return sum / count;
}

float medianValue(const float* buffer, uint8_t count) {
  if (count == 0) return 0.0f;

  float temp[MEDIAN_SCRATCH_SIZE];
  uint8_t n = (count < MEDIAN_SCRATCH_SIZE) ? count : MEDIAN_SCRATCH_SIZE;
  for (uint8_t i = 0; i < n; i++) temp[i] = buffer[i];

  // Insertion sort for small n
  for (uint8_t i = 0; i < n - 1; i++) {
    for (uint8_t j = i + 1; j < n; j++) {
      if (temp[j] < temp[i]) {
        float t = temp[i]; temp[i] = temp[j]; temp[j] = t;
      }
    }
  }

  if (n % 2 == 0) return (temp[(n / 2) - 1] + temp[n / 2]) * 0.5f;
  return temp[n / 2];
}

void startBuzzerPulse() {
  digitalWrite(BUZZER, HIGH);
  buzzerOn        = true;
  buzzerTurnOffAt = millis() + BUZZER_ON_MS;
}

void updateBuzzerState(unsigned long nowMs) {
  if (buzzerOn && nowMs >= buzzerTurnOffAt) {
    digitalWrite(BUZZER, LOW);
    buzzerOn = false;
  }
}

// ============================================================
// SETUP HELPERS
// ============================================================

void scanI2CDevices() {
  Serial.println("Scanning I2C bus...");
  int found = 0;
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print("  Found device at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      found++;
    }
  }
  if (found == 0) Serial.println("  No I2C devices found.");
  else { Serial.print("  I2C scan done. Devices: "); Serial.println(found); }
}

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi ");
  Serial.print("Connecting to WiFi");

  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < 15000UL) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\nWiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connect timed out. Will retry in loop.");
  }
}

// ============================================================
// MAX30102 SETUP
// Using: setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange)
//   ledBrightness = 60 (0–255), sampleAverage = 4, ledMode = 2 (Red+IR),
//   sampleRate = 100 Hz, pulseWidth = 411 us, adcRange = 4096 nA (max sensitivity)
// This configuration is optimised for SpO2+HR measurement.
// ============================================================
void setupMax30102() {
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("ERROR: MAX30102 not found. Check SDA/SCL wiring and 3.3V supply.");
    max30102Available = false;
    lcd.setCursor(0, 1);
    lcd.print("MAX30102 FAIL   ");
    return;
  }

  // ledBrightness=60, sampleAvg=4, ledMode=2(Red+IR), sampleRate=100, pulseWidth=411, adcRange=4096
  particleSensor.setup(60, 4, 2, 100, 411, 4096);

  // Tune LED amplitudes for stable finger readings
  particleSensor.setPulseAmplitudeRed(0x1F);  // increased from 0x0A for stronger signal
  particleSensor.setPulseAmplitudeIR(0x3F);   // strong IR for reliable SpO2
  particleSensor.setPulseAmplitudeGreen(0);   // green LED off — not used in HR/SpO2 mode

  max30102Available = true;
  Serial.println("MAX30102 ready (I2C, SpO2+HR mode, 100Hz, 411us pulse, 4096nA range)");
}

// ============================================================
// ADXL345 REGISTER-LEVEL I2C
// Wiring: SDO -> GND => I2C address 0x53
// DATA_FORMAT 0x08 = full-resolution mode, ±2g (scale: 3.9mg/LSB = 0.0039g/LSB)
// BW_RATE     0x0A = 100 Hz output data rate
// POWER_CTL   0x08 = measurement mode (bit3=1)
// ============================================================
void writeRegister(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(ADXL345_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

bool readRegister(uint8_t reg, uint8_t& value) {
  Wire.beginTransmission(ADXL345_ADDR);
  Wire.write(reg);
  if (Wire.endTransmission() != 0)               return false;
  if (Wire.requestFrom((int)ADXL345_ADDR, 1) != 1) return false;
  value = Wire.read();
  return true;
}

// Read raw XYZ acceleration and convert to g units (full-res mode: 0.0039g/LSB)
bool readXYZ(float& xG, float& yG, float& zG) {
  if (!adxlAvailable) return false;

  Wire.beginTransmission(ADXL345_ADDR);
  Wire.write(ADXL345_REG_DATAX0);
  if (Wire.endTransmission() != 0)              return false;
  if (Wire.requestFrom((int)ADXL345_ADDR, 6) < 6) return false;

  // Little-endian: low byte first, high byte second
  int16_t xRaw = (int16_t)(Wire.read() | (Wire.read() << 8));
  int16_t yRaw = (int16_t)(Wire.read() | (Wire.read() << 8));
  int16_t zRaw = (int16_t)(Wire.read() | (Wire.read() << 8));

  // Scale: 3.9 mg/LSB in full-resolution ±2g mode (DATA_FORMAT=0x08)
  xG = xRaw * 0.0039f;
  yG = yRaw * 0.0039f;
  zG = zRaw * 0.0039f;
  return true;
}

void setupAccelerometer() {
  uint8_t devid = 0;
  // ADXL345 returns 0xE5 for device ID register 0x00
  adxlAvailable = readRegister(ADXL345_REG_DEVID, devid) && (devid == 0xE5);

  if (adxlAvailable) {
    writeRegister(ADXL345_REG_POWER_CTL,   0x00);  // standby mode first
    writeRegister(ADXL345_REG_DATA_FORMAT, 0x08);  // full-resolution, ±2g range
    writeRegister(ADXL345_REG_BW_RATE,     0x0A);  // 100 Hz output rate
    writeRegister(ADXL345_REG_POWER_CTL,   0x08);  // enter measurement mode
    adxlReadFailCount = 0;
    Serial.println("ADXL345 ready (I2C 0x53, full-res ±2g, 100Hz)");
  } else {
    Serial.print("ERROR: ADXL345 not found at 0x53. DevID=0x");
    Serial.println(devid, HEX);
    Serial.println("  Check: SDO->GND for 0x53, CS->3.3V for I2C mode");
    lcd.setCursor(0, 1);
    lcd.print("ADXL345 FAIL    ");
  }
}

// ============================================================
// SENSOR READ: LM335 TEMPERATURE
// Formula: tempC = (ADC * 5.0 / 1023.0 * 100.0) - 273.15
//   = voltage * 100 - 273.15   [as specified in requirements]
// 7-sample median + weighted blend for smoothing.
// ============================================================
float readTemperatureRawC() {
  const uint8_t sampleCount = 7;
  int samples[sampleCount];

  // Collect 7 raw ADC samples from A1
  for (uint8_t i = 0; i < sampleCount; i++) {
    samples[i] = analogRead(TEMP_PIN);
    delayMicroseconds(200);  // small gap to let ADC settle between reads
  }

  // Sort for median
  for (uint8_t i = 0; i < sampleCount - 1; i++) {
    for (uint8_t j = i + 1; j < sampleCount; j++) {
      if (samples[j] < samples[i]) {
        int t = samples[i]; samples[i] = samples[j]; samples[j] = t;
      }
    }
  }

  int   medianAdc = samples[sampleCount / 2];
  float voltage   = (medianAdc * 5.0f) / 1023.0f;

  // LM335: output voltage proportional to Kelvin at 10mV/K
  // Celsius = (voltage * 100) - 273.15  [exact formula from requirements]
  float tempC = (voltage * 100.0f) - 273.15f;

  return tempC + TEMP_OFFSET_C;
}

void updateTemperature() {
  float tempRaw = readTemperatureRawC();
  if (!isFiniteNumber(tempRaw)) {
    Serial.println("WARN: LM335 returned non-finite value. Check A1 wiring.");
    return;
  }

  pushSample(tempBuffer, TEMP_WINDOW, tempRaw, tempIndex, tempCount);

  // Weighted blend: 65% median (spike-resistant) + 35% average (smooth)
  float blended = (medianValue(tempBuffer, tempCount) * 0.65f)
                + (movingAverage(tempBuffer, tempCount) * 0.35f);

  if (blended >= TEMP_VALID_MIN_C && blended <= TEMP_VALID_MAX_C) {
    temperature = blended;
  }
  // If out of range, retain previous valid value — no silent reset
}

// ============================================================
// SENSOR READ: MAX30102 (PRIMARY BPM + SpO2 SOURCE)
// Fills irBuffer/redBuffer with up to MAX30102_SAMPLE_BUFFER samples.
// Beat detection runs on every IR sample for instant BPM.
// Maxim SpO2 algo runs when >= 100 samples available + finger confirmed.
// ============================================================
void readMax30102Sensor() {
  if (!max30102Available) {
    max30102FingerPresent = max30102AlgoHrValid = max30102AlgoSpo2Valid = false;
    return;
  }

  particleSensor.check();  // pump FIFO — non-blocking

  bufferLength = 0;
  while (particleSensor.available() && bufferLength < MAX30102_SAMPLE_BUFFER) {
    redBuffer[bufferLength] = particleSensor.getRed();
    irBuffer[bufferLength]  = particleSensor.getIR();
    particleSensor.nextSample();
    bufferLength++;
  }

  if (bufferLength == 0) {
    // No new samples in FIFO — keep previous state
    max30102FingerPresent = false;
    max30102AlgoHrValid   = false;
    max30102AlgoSpo2Valid = false;
    return;
  }

  // Compute averages and detect beats across all new samples
  long irSum = 0, redSum = 0;
  for (uint16_t i = 0; i < bufferLength; i++) {
    irSum  += (long)irBuffer[i];
    redSum += (long)redBuffer[i];

    // Per-sample beat detection (checkForBeat uses internal IR history)
    if (checkForBeat(irBuffer[i])) {
      unsigned long now   = millis();
      unsigned long delta = now - max30102LastBeatTime;
      max30102LastBeatTime = now;

      // Only accept physiologically plausible inter-beat intervals (300–2000ms = 30–200 BPM)
      if (delta > 300 && delta < 2000) {
        int instantBpm = (int)round(60000.0f / (float)delta);
        if (instantBpm >= BPM_VALID_MIN && instantBpm <= BPM_VALID_MAX) {
          pushSample(bpmBuffer, BPM_WINDOW, (float)instantBpm, bpmIndex, bpmCount);
        }
      }
    }
  }

  max30102RawIR  = (int)(irSum  / bufferLength);
  max30102RawRed = (int)(redSum / bufferLength);

  // Finger present only if both IR and Red signals exceed threshold
  // Threshold 50000 filters ambient noise when no finger is placed
  max30102FingerPresent = (max30102RawIR  >= MAX30102_MIN_SIGNAL
                        && max30102RawRed >= MAX30102_MIN_SIGNAL);

  max30102AlgoHrValid   = false;
  max30102AlgoSpo2Valid = false;

  // Run Maxim SpO2 algorithm only when buffer is full AND finger is present
  if (max30102FingerPresent && bufferLength >= MAX30102_ALGO_MIN_SAMPLES) {
    int32_t algoSpo2      = 0; int8_t algoSpo2Valid = 0;
    int32_t algoHr        = 0; int8_t algoHrValid   = 0;

    maxim_heart_rate_and_oxygen_saturation(
      irBuffer,  bufferLength, redBuffer,
      &algoSpo2, &algoSpo2Valid,
      &algoHr,   &algoHrValid
    );

    if (algoHrValid == 1 && algoHr >= BPM_VALID_MIN && algoHr <= BPM_VALID_MAX) {
      max30102AlgoHr      = (int)algoHr;
      max30102AlgoHrValid = true;
    }
    if (algoSpo2Valid == 1 && algoSpo2 >= SPO2_VALID_MIN && algoSpo2 <= SPO2_VALID_MAX) {
      max30102AlgoSpo2      = (int)algoSpo2;
      max30102AlgoSpo2Valid = true;
    }
  }
}

// ============================================================
// UPDATE BPM from MAX30102 (ONLY source)
// Uses algo result when available; falls back to beat-detection average.
// Rejects jumps > 25 BPM from last valid to prevent graph spikes.
// ============================================================
void updateHeartRate() {
  if (!max30102Available || bufferLength == 0 || !max30102FingerPresent) {
    bpm = lastValidBpm;  // hold last valid when finger removed
    return;
  }

  if (max30102AlgoHrValid) {
    pushSample(bpmBuffer, BPM_WINDOW, (float)max30102AlgoHr, bpmIndex, bpmCount);
  }

  if (bpmCount > 0) {
    int stabilized = (int)round(
      (medianValue(bpmBuffer, bpmCount)  * 0.6f) +
      (movingAverage(bpmBuffer, bpmCount) * 0.4f)
    );

    if (stabilized >= BPM_VALID_MIN && stabilized <= BPM_VALID_MAX) {
      // Reject sudden jumps > 25 BPM (unless buffer is still filling)
      if (abs(stabilized - lastValidBpm) <= 25 || bpmCount < 3) {
        lastValidBpm = stabilized;
      }
    }
  }

  bpm = lastValidBpm;
}

// ============================================================
// UPDATE SpO2 from MAX30102 (ONLY source)
// Median+average blend; rejects jumps > 5% from last valid.
// ============================================================
void updateSpO2() {
  if (!max30102Available || bufferLength == 0 || !max30102FingerPresent
      || !max30102AlgoSpo2Valid) {
    spo2 = lastValidSpo2;  // hold last valid
    return;
  }

  pushSample(spo2Buffer, SPO2_WINDOW, (float)max30102AlgoSpo2, spo2Index, spo2Count);

  int stabilized = (int)round(
    (medianValue(spo2Buffer, spo2Count)  * 0.65f) +
    (movingAverage(spo2Buffer, spo2Count) * 0.35f)
  );

  if (stabilized >= SPO2_VALID_MIN && stabilized <= SPO2_VALID_MAX) {
    if (abs(stabilized - lastValidSpo2) <= 5 || spo2Count < 3) {
      lastValidSpo2 = stabilized;
    }
    spo2 = stabilized;
  } else {
    spo2 = lastValidSpo2;
  }
}

// ============================================================
// FALL DETECTION via ADXL345 (non-blocking, millis-based)
// Stage 1: total-g drops below FREE_FALL_THRESHOLD_G  → free fall suspected
// Stage 2: within IMPACT_WINDOW_MS, total-g spikes above IMPACT_THRESHOLD_G → confirmed fall
// Fallback: if window expires and total-g > MOTION_THRESHOLD_G → motion-based fall
// fallDetected auto-clears after FALL_HOLD_MS
// ============================================================
void updateFallDetection(unsigned long nowMs) {
  if (!adxlAvailable) {
    fallDetected = false;
    return;
  }

  float xG = 0, yG = 0, zG = 0;
  if (!readXYZ(xG, yG, zG)) {
    adxlReadFailCount++;

    if ((nowMs - lastAdxlErrorPrint) >= ADXL_ERROR_PRINT_MS) {
      lastAdxlErrorPrint = nowMs;
      Serial.print("WARN: ADXL345 read failed (count=");
      Serial.print(adxlReadFailCount);
      Serial.println(")");
    }

    // 3 consecutive failures → attempt re-init
    if (adxlReadFailCount >= 3) {
      Serial.println("Reinitializing ADXL345...");
      setupAccelerometer();
      adxlReadFailCount = 0;
    }
    return;
  }

  adxlReadFailCount = 0;
  float total_g = sqrt((xG * xG) + (yG * yG) + (zG * zG));
  lastTotalG = total_g;

  // Stage 1: detect free fall (low total-g)
  if (!waitingForImpact && total_g < FREE_FALL_THRESHOLD_G) {
    waitingForImpact   = true;
    freeFallDetectedAt = nowMs;
    Serial.print("Fall stage 1: free fall suspected, total_g=");
    Serial.println(total_g, 3);
  }

  if (waitingForImpact) {
    if ((nowMs - freeFallDetectedAt) <= IMPACT_WINDOW_MS
        && total_g > IMPACT_THRESHOLD_G) {
      // Stage 2 confirmed: free fall + impact
      fallDetected     = true;
      fallDetectedAt   = nowMs;
      waitingForImpact = false;
      startBuzzerPulse();
      Serial.print("FALL DETECTED (free-fall + impact), total_g=");
      Serial.println(total_g, 3);

    } else if ((nowMs - freeFallDetectedAt) > IMPACT_WINDOW_MS) {
      // Window expired — check motion fallback
      if (total_g > MOTION_THRESHOLD_G) {
        fallDetected   = true;
        fallDetectedAt = nowMs;
        startBuzzerPulse();
        Serial.print("FALL DETECTED (motion fallback), total_g=");
        Serial.println(total_g, 3);
      }
      waitingForImpact = false;
    }
  }

  // Auto-clear fall flag after hold period
  if (fallDetected && (nowMs - fallDetectedAt) > FALL_HOLD_MS) {
    fallDetected = false;
    Serial.println("Fall flag cleared.");
  }
}

// ============================================================
// GPS UPDATE (NEO-6M, non-blocking)
// Feeds all available bytes to TinyGPS++.
// Requires GPS_STABLE_FIXES consistent readings before committing coords.
// gpsCoordinateValid stays false until stability is confirmed.
// ============================================================
bool isValidCoordinate(float lat, float lon) {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) return false;
  if (lat < -90.0f  || lat > 90.0f)   return false;
  if (lon < -180.0f || lon > 180.0f)  return false;
  if (fabs(lat) < 0.0001f && fabs(lon) < 0.0001f) return false;  // 0,0 is invalid
  return true;
}

void updateGPS() {
  // Drain all available bytes — non-blocking, runs every loop()
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  if (gps.location.isValid() && gps.location.age() < 2000) {
    float newLat = (float)gps.location.lat();
    float newLon = (float)gps.location.lng();

    if (isValidCoordinate(newLat, newLon)) {
      // Check stability: new fix must be within ~44m of pending
      if (fabs(newLat - pendingLat) < 0.0004f && fabs(newLon - pendingLon) < 0.0004f) {
        if (gpsStableCount < 255) gpsStableCount++;
      } else {
        // Significant position jump — restart stability counter
        gpsStableCount = 1;
        pendingLat = newLat;
        pendingLon = newLon;
      }

      if (gpsStableCount >= GPS_STABLE_FIXES) {
        latitude           = newLat;
        longitude          = newLon;
        gpsCoordinateValid = true;
      }
    } else {
      gpsCoordinateValid = false;
    }
  } else {
    gpsCoordinateValid = false;
  }
}

// ============================================================
// LCD DISPLAY
// Row 0: Temperature + BPM
// Row 1: Fall status
// ============================================================
void displayOnLCD() {
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(temperature, 1);
  lcd.print(" B:");
  if (bpm < 100) lcd.print("0");
  if (bpm < 10)  lcd.print("0");
  lcd.print(bpm);
  lcd.print(" ");

  lcd.setCursor(0, 1);
  lcd.print("FALL:");
  lcd.print(fallDetected ? "DETECTED " : "NORMAL   ");
}

// ============================================================
// SERIAL DEBUG OUTPUT
// ============================================================
void printDebugInfo() {
  Serial.print("[DEBUG] Temp:");    Serial.print(temperature, 2);
  Serial.print("C | BPM:");        Serial.print(bpm);
  Serial.print(" | SpO2:");        Serial.print(spo2);
  Serial.print("% | Lat:");        Serial.print(latitude, 6);
  Serial.print(" | Lon:");         Serial.print(longitude, 6);
  Serial.print(" | GPS:");         Serial.print(gpsCoordinateValid ? "VALID" : "SEARCHING");
  Serial.print(" | WiFi:");        Serial.print(WiFi.status() == WL_CONNECTED ? "OK" : "DOWN");
  Serial.print(" | Finger:");      Serial.print(max30102FingerPresent ? "YES" : "NO");
  Serial.print(" | totalG:");      Serial.print(lastTotalG, 2);
  if (fallDetected) Serial.print(" | *** FALL ALERT ***");
  Serial.println();
}

// ============================================================
// SEND DATA TO WEB SERVER (existing API — structure unchanged)
// JSON fields: temperature, bpm, spo2, fall, lat, lon, timestamp(optional)
// ============================================================
bool sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Skipping send.");
    return false;
  }

  Serial.println("Sending data...");  // required debug log

  bool gpsTimestampValid = gps.date.isValid() && gps.time.isValid();

  // Use real GPS coords only when confirmed valid; else use default Delhi coords
  float sendLat = (gpsCoordinateValid && isValidCoordinate(latitude, longitude))
                    ? latitude  : 28.6139f;
  float sendLon = (gpsCoordinateValid && isValidCoordinate(latitude, longitude))
                    ? longitude : 77.2090f;

  JsonDocument doc;
  doc["temperature"] = clampFloat(temperature, TEMP_VALID_MIN_C, TEMP_VALID_MAX_C);
  doc["bpm"]         = (bpm  >= BPM_VALID_MIN  && bpm  <= BPM_VALID_MAX)  ? bpm  : lastValidBpm;
  doc["spo2"]        = (spo2 >= SPO2_VALID_MIN && spo2 <= SPO2_VALID_MAX) ? spo2 : lastValidSpo2;
  doc["fall"]        = fallDetected;
  doc["lat"]         = sendLat;
  doc["lon"]         = sendLon;

  if (gpsTimestampValid) {
    char timestampIso[25];
    snprintf(timestampIso, sizeof(timestampIso),
             "%04d-%02d-%02dT%02d:%02d:%02dZ",
             gps.date.year(), gps.date.month(), gps.date.day(),
             gps.time.hour(), gps.time.minute(), gps.time.second());
    doc["timestamp"] = timestampIso;
  }

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("Payload (");
  Serial.print(jsonString.length());
  Serial.print("B): ");
  Serial.println(jsonString);

  bool connected = false;
  for (uint8_t attempt = 1; attempt <= SERVER_CONNECT_RETRIES; attempt++) {
    connected = serverIPValid
                  ? client.connect(serverIP, serverPort)
                  : client.connect(serverAddress, serverPort);
    if (connected) break;

    Serial.print("Connect attempt ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.print(SERVER_CONNECT_RETRIES);
    Serial.println(" failed.");
    delay(80);
  }

  if (!connected) {
    Serial.print("ERROR: Could not reach server ");
    Serial.print(serverAddress);
    Serial.print(":");
    Serial.println(serverPort);
    return false;
  }

  // HTTP POST — Content-Length must be exact (use print not println for body)
  client.println("POST /api/data HTTP/1.1");
  client.print("Host: ");
  client.print(serverAddress);
  client.print(":");
  client.println(serverPort);
  client.println("Content-Type: application/json");
  client.print("Content-Length: ");
  client.println(jsonString.length());
  client.println("Connection: close");
  client.println();
  client.print(jsonString);  // print, NOT println — keeps Content-Length accurate

  // Drain response with fixed deadline (no deadline-extension on each byte)
  unsigned long waitStart = millis();
  while (client.connected() && (millis() - waitStart) < 500UL) {
    while (client.available()) client.read();
  }
  client.stop();

  Serial.println("Data sent successfully.");
  return true;
}

// ============================================================
// WIFI MAINTENANCE (non-blocking retry in loop)
// ============================================================
void maintainWiFi(unsigned long nowMs) {
  if (WiFi.status() == WL_CONNECTED) return;

  if ((nowMs - lastWiFiRetry) >= WIFI_RETRY_MS) {
    lastWiFiRetry = nowMs;
    WiFi.begin(ssid, password);
    Serial.println("WiFi reconnect triggered...");
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(9600);
  while (!Serial && millis() < 3000);  // wait up to 3s for Serial on native-USB boards

  gpsSerial.begin(9600);   // NEO-6M default baud rate

  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Initializing...");

  Wire.begin();
  Wire.setClock(100000);   // 100 kHz — safe for both ADXL345 and MAX30102

  scanI2CDevices();

  // Resolve server address once (IP mode is faster; hostname mode is fallback)
  serverIPValid = serverIP.fromString(serverAddress);
  if (serverIPValid) {
    Serial.print("Server IP: ");
    Serial.println(serverIP);
  } else {
    Serial.println("Server address is hostname — using DNS mode.");
  }

  setupAccelerometer();
  setupMax30102();

  Serial.println("Sensors initialized");  // required debug log

  connectToWiFi();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready    ");

  unsigned long nowMs = millis();
  lastSensorUpdate = lastLcdUpdate = lastSend = lastDebugPrint = lastWiFiRetry = nowMs;
}

// ============================================================
// LOOP — non-blocking scheduler
// All timing controlled by millis(); no blocking delays.
// ============================================================
void loop() {
  unsigned long nowMs = millis();

  maintainWiFi(nowMs);         // reconnect if WiFi dropped
  updateBuzzerState(nowMs);    // turn off buzzer after timeout
  updateGPS();                 // feed GPS FIFO continuously

  // Sensor reads every SENSOR_UPDATE_MS (120ms)
  if ((nowMs - lastSensorUpdate) >= SENSOR_UPDATE_MS) {
    lastSensorUpdate = nowMs;

    readMax30102Sensor();       // pump MAX30102 FIFO, compute raw values
    updateTemperature();        // LM335 read + median/average filter
    updateHeartRate();          // BPM from MAX30102 only
    updateSpO2();               // SpO2 from MAX30102 only
    updateFallDetection(nowMs); // ADXL345 free-fall + impact detection
  }

  // LCD refresh every LCD_UPDATE_MS (450ms)
  if ((nowMs - lastLcdUpdate) >= LCD_UPDATE_MS) {
    lastLcdUpdate = nowMs;
    displayOnLCD();
  }

  // Send to web dashboard every SEND_INTERVAL_MS (2000ms)
  if ((nowMs - lastSend) >= SEND_INTERVAL_MS) {
    lastSend = nowMs;
    sendDataToServer();
  }

  // Serial debug every DEBUG_PRINT_MS (2000ms)
  if ((nowMs - lastDebugPrint) >= DEBUG_PRINT_MS) {
    lastDebugPrint = nowMs;
    printDebugInfo();
  }
}
