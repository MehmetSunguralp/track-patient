#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define LED_PIN 2

// ================= UUIDs =================
#define SERVICE_UUID           "12345678-1234-1234-1234-1234567890ab"
#define CHARACTERISTIC_TX_UUID "12345678-1234-1234-1234-1234567890ac" // App → ESP32
#define CHARACTERISTIC_RX_UUID "12345678-1234-1234-1234-1234567890ad" // ESP32 → App

BLEServer* pServer = nullptr;
BLECharacteristic* pTxCharacteristic = nullptr;
BLECharacteristic* pRxCharacteristic = nullptr;

bool deviceConnected = false;
bool oldDeviceConnected = false;

// ================= Patient =================
#define PATIENT_ID "01"  // Pod ID 01-26 (2 chars)

// Store previous values for Live packet (t-1 and t-2)
struct PreviousData {
  String lat4;  // Last 4 digits of latitude
  String lat4_2; // Two samples before
  String lon4;  // Last 4 digits of longitude
  String lon4_2; // Two samples before
  String vel5;  // Velocity (5 chars)
  String vel5_2; // Two samples before
};

PreviousData prevData;
unsigned long lastLiveTime = 0;
unsigned long lastTotalTime = 0;
unsigned long lastStatusTime = 0;
const unsigned long LIVE_INTERVAL = 1000;   // Send every 1 second
const unsigned long TOTAL_INTERVAL = 2000;  // Send every 2 seconds
const unsigned long STATUS_INTERVAL = 10000; // Send every 10 seconds (reduced from 60 for testing)

// ================= CRC-8 Calculation =================
uint8_t calculateCRC8(const String& data) {
  uint8_t crc = 0;
  for (int i = 0; i < data.length(); i++) {
    crc ^= data.charAt(i);
    for (int j = 0; j < 8; j++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ 0x07;
      } else {
        crc <<= 1;
      }
    }
  }
  return crc;
}

// ================= Format Helpers =================
String formatLatitude(float lat) {
  // Format: "4901.5232N" (10 chars) - no space, direction at end
  // Convert decimal degrees to DDMM.MMMMM format
  int degrees = (int)abs(lat);
  float minutes = (abs(lat) - degrees) * 60.0;
  String dir = lat >= 0 ? "N" : "S";
  
  // Format: DDMM.MMMMM + direction (no space)
  String result = "";
  if (degrees < 10) result += "0";
  result += String(degrees);
  
  int minInt = (int)minutes;
  if (minInt < 10) result += "0";
  result += String(minInt);
  result += ".";
  
  // 5 decimal places for fractional minutes
  int minFrac = (int)((minutes - minInt) * 100000);
  if (minFrac < 10000) result += "0";
  if (minFrac < 1000) result += "0";
  if (minFrac < 100) result += "0";
  if (minFrac < 10) result += "0";
  result += String(minFrac);
  result += dir; // No space before direction
  
  return result;
}

String formatLongitude(float lon) {
  // Format: "12305.823W" (11 chars) - no space, direction at end
  int degrees = (int)abs(lon);
  float minutes = (abs(lon) - degrees) * 60.0;
  String dir = lon >= 0 ? "E" : "W";
  
  String result = "";
  if (degrees < 100) result += "0";
  if (degrees < 10) result += "0";
  result += String(degrees);
  
  int minInt = (int)minutes;
  if (minInt < 10) result += "0";
  result += String(minInt);
  result += ".";
  
  // 3 decimal places for fractional minutes
  int minFrac = (int)((minutes - minInt) * 1000);
  if (minFrac < 100) result += "0";
  if (minFrac < 10) result += "0";
  result += String(minFrac);
  result += dir; // No space before direction
  
  return result;
}

String getLast4Digits(String value) {
  // Extract last 4 numeric digits from a formatted coordinate
  // For "4901.5232N", we want "5232" (last 4 digits before direction)
  String digits = "";
  for (int i = value.length() - 2; i >= 0 && digits.length() < 4; i--) { // Skip last char (direction)
    char c = value.charAt(i);
    if (c >= '0' && c <= '9') {
      digits = String(c) + digits;
    } else {
      break;
    }
  }
  
  // Pad with zeros if needed
  while (digits.length() < 4) {
    digits = "0" + digits;
  }
  
  return digits;
}

// ================= Generate Live Packet (L) =================
String generateLivePacket() {
  // Generate random data
  float lat = 41.015 + random(-50, 50) / 1000.0;
  float lon = 28.979 + random(-50, 50) / 1000.0;
  float speedKmh = random(10, 80) / 10.0;
  float speedKnots = speedKmh / 1.852; // Convert to knots
  int bpm = random(60, 140);
  float metabolicPower = random(10, 100) / 10.0;
  float skinTemp = 36.0 + random(0, 20) / 10.0; // 36.0 to 38.0 degrees C
  
  // Get current time (simulated GPS time)
  unsigned long seconds = millis() / 1000;
  int hours = (seconds / 3600) % 24;
  int minutes = (seconds / 60) % 60;
  int secs = seconds % 60;
  
  String packet = "";
  
  // 1. Packet Type
  packet += "L";
  
  // 2. Pod ID (2 chars)
  packet += PATIENT_ID;
  
  // 3. GPS Time (6 chars: HHMMSS)
  if (hours < 10) packet += "0";
  packet += String(hours);
  if (minutes < 10) packet += "0";
  packet += String(minutes);
  if (secs < 10) packet += "0";
  packet += String(secs);
  
  // 4. GPS Fix (1 char: '0' or '1')
  packet += "1"; // Always fixed for simulation
  
  // 5. Latitude (10 chars)
  String latStr = formatLatitude(lat);
  packet += latStr;
  
  // 6. Previous Latitude t-1 (4 chars)
  packet += prevData.lat4;
  
  // 7. Previous Latitude t-2 (4 chars)
  packet += prevData.lat4_2;
  
  // 8. Longitude (11 chars)
  String lonStr = formatLongitude(lon);
  packet += lonStr;
  
  // 9. Previous Longitude t-1 (4 chars)
  packet += prevData.lon4;
  
  // 10. Previous Longitude t-2 (4 chars)
  packet += prevData.lon4_2;
  
  // 11. Velocity knots (5 chars)
  String velStr = String((int)(speedKnots * 10));
  while (velStr.length() < 5) velStr = "0" + velStr;
  packet += velStr;
  
  // 12. Previous Velocity t-1 (5 chars)
  packet += prevData.vel5;
  
  // 13. Previous Velocity t-2 (5 chars)
  packet += prevData.vel5_2;
  
  // 14. Heart Rate BPM (3 chars)
  String bpmStr = String(bpm);
  while (bpmStr.length() < 3) bpmStr = "0" + bpmStr;
  packet += bpmStr;
  
  // 15. Metabolic Power W/kg (5 chars, 1 decimal)
  String powerStr = String((int)(metabolicPower * 10));
  while (powerStr.length() < 5) powerStr = "0" + powerStr;
  packet += powerStr;
  
  // Calculate CRC-8 (before adding CRC and terminator)
  uint8_t crc = calculateCRC8(packet);
  
  // 16. CRC-8 (2 hex chars)
  char crcHex[3];
  sprintf(crcHex, "%02X", crc);
  packet += String(crcHex);
  
  // 17. Terminator
  packet += "D";
  
  // Update previous values for next packet
  prevData.lat4_2 = prevData.lat4;
  prevData.lat4 = getLast4Digits(latStr);
  prevData.lon4_2 = prevData.lon4;
  prevData.lon4 = getLast4Digits(lonStr);
  prevData.vel5_2 = prevData.vel5;
  prevData.vel5 = velStr;
  
  return packet;
}

// ================= Generate Total Packet (T) =================
String generateTotalPacket() {
  // Generate cumulative data
  int playerLoad = random(1000, 50000);
  int totalDistance = random(100, 10000);
  int hmdlDistance = random(50, 5000);
  int z6Distance = random(0, 1000);
  int z5Distance = random(0, 2000);
  int z4Distance = random(0, 3000);
  int z6Count = random(0, 50);
  int z5Count = random(0, 100);
  int z4Count = random(0, 200);
  int totalAcc = random(0, 500);
  int totalDec = random(0, 500);
  int totalImpacts = random(0, 100);
  int stepBalanceSide = random(0, 2); // 0 or 1
  int stepBalanceValue = random(0, 1000);
  float maxSpeed = random(100, 500) / 10.0;
  float lastMinMaxSpeed = random(80, 400) / 10.0;
  int rrAvg = random(450, 1000);
  int maxHR = random(120, 180);
  
  // Get current time
  unsigned long seconds = millis() / 1000;
  int hours = (seconds / 3600) % 24;
  int minutes = (seconds / 60) % 60;
  int secs = seconds % 60;
  
  String packet = "";
  
  // 1. Packet Type
  packet += "T";
  
  // 2. Pod ID (2 chars)
  packet += PATIENT_ID;
  
  // 3. GPS Time (6 chars)
  if (hours < 10) packet += "0";
  packet += String(hours);
  if (minutes < 10) packet += "0";
  packet += String(minutes);
  if (secs < 10) packet += "0";
  packet += String(secs);
  
  // 4. GPS Fix (1 char)
  packet += "1";
  
  // 5. Player Load (5 chars)
  String loadStr = String(playerLoad);
  while (loadStr.length() < 5) loadStr = "0" + loadStr;
  packet += loadStr;
  
  // 6. Total Distance (5 chars)
  String distStr = String(totalDistance);
  while (distStr.length() < 5) distStr = "0" + distStr;
  packet += distStr;
  
  // 7. HMDL Distance (5 chars)
  String hmdlStr = String(hmdlDistance);
  while (hmdlStr.length() < 5) hmdlStr = "0" + hmdlStr;
  packet += hmdlStr;
  
  // 8. Z6 Distance (4 chars)
  String z6Str = String(z6Distance);
  while (z6Str.length() < 4) z6Str = "0" + z6Str;
  packet += z6Str;
  
  // 9. Z5 Distance (4 chars)
  String z5Str = String(z5Distance);
  while (z5Str.length() < 4) z5Str = "0" + z5Str;
  packet += z5Str;
  
  // 10. Z4 Distance (4 chars)
  String z4Str = String(z4Distance);
  while (z4Str.length() < 4) z4Str = "0" + z4Str;
  packet += z4Str;
  
  // 11. Z6 Count (2 chars)
  String z6cStr = String(z6Count);
  while (z6cStr.length() < 2) z6cStr = "0" + z6cStr;
  packet += z6cStr;
  
  // 12. Z5 Count (3 chars)
  String z5cStr = String(z5Count);
  while (z5cStr.length() < 3) z5cStr = "0" + z5cStr;
  packet += z5cStr;
  
  // 13. Z4 Count (3 chars)
  String z4cStr = String(z4Count);
  while (z4cStr.length() < 3) z4cStr = "0" + z4cStr;
  packet += z4cStr;
  
  // 14. Total Accelerations (3 chars)
  String accStr = String(totalAcc);
  while (accStr.length() < 3) accStr = "0" + accStr;
  packet += accStr;
  
  // 15. Total Decelerations (3 chars)
  String decStr = String(totalDec);
  while (decStr.length() < 3) decStr = "0" + decStr;
  packet += decStr;
  
  // 16. Total Impacts (2 chars)
  String impStr = String(totalImpacts);
  while (impStr.length() < 2) impStr = "0" + impStr;
  packet += impStr;
  
  // 17. Step Balance Side (1 char)
  packet += String(stepBalanceSide);
  
  // 18. Step Balance Value (4 chars)
  String sbValStr = String(stepBalanceValue);
  while (sbValStr.length() < 4) sbValStr = "0" + sbValStr;
  packet += sbValStr;
  
  // 19. Max Speed (4 chars, 1 decimal)
  String maxSpdStr = String((int)(maxSpeed * 10));
  while (maxSpdStr.length() < 4) maxSpdStr = "0" + maxSpdStr;
  packet += maxSpdStr;
  
  // 20. Last Minute Max Speed (4 chars, 1 decimal)
  String lmmSpdStr = String((int)(lastMinMaxSpeed * 10));
  while (lmmSpdStr.length() < 4) lmmSpdStr = "0" + lmmSpdStr;
  packet += lmmSpdStr;
  
  // 21. RR Average (3 chars)
  String rrStr = String(rrAvg);
  while (rrStr.length() < 3) rrStr = "0" + rrStr;
  packet += rrStr;
  
  // 22. Max Heart Rate (3 chars)
  String maxHRStr = String(maxHR);
  while (maxHRStr.length() < 3) maxHRStr = "0" + maxHRStr;
  packet += maxHRStr;
  
  // Calculate CRC-8
  uint8_t crc = calculateCRC8(packet);
  
  // 23. CRC-8 (2 hex chars)
  char crcHex[3];
  sprintf(crcHex, "%02X", crc);
  packet += String(crcHex);
  
  // 24. Terminator
  packet += "D";
  
  return packet;
}

// ================= Generate Status Packet (S) =================
String generateStatusPacket() {
  // Get current date/time
  unsigned long seconds = millis() / 1000;
  int hours = (seconds / 3600) % 24;
  int minutes = (seconds / 60) % 60;
  int secs = seconds % 60;
  
  // Simulate date (YYMMDD) - using day of year
  int dayOfYear = (seconds / 86400) % 365;
  int year = 24; // 2024
  int month = (dayOfYear / 30) % 12 + 1;
  int day = (dayOfYear % 30) + 1;
  
  String packet = "";
  
  // 1. Packet Type
  packet += "S";
  
  // 2. Pod ID (2 chars)
  packet += PATIENT_ID;
  
  // 3. GPS Date (6 chars: YYMMDD)
  if (year < 10) packet += "0";
  packet += String(year);
  if (month < 10) packet += "0";
  packet += String(month);
  if (day < 10) packet += "0";
  packet += String(day);
  
  // 4. GPS Time (6 chars: HHMMSS)
  if (hours < 10) packet += "0";
  packet += String(hours);
  if (minutes < 10) packet += "0";
  packet += String(minutes);
  if (secs < 10) packet += "0";
  packet += String(secs);
  
  // 5. Reserved Field (12 chars)
  packet += "000000000000";
  
  // Calculate CRC-8
  uint8_t crc = calculateCRC8(packet);
  
  // 6. CRC-8 (2 hex chars)
  char crcHex[3];
  sprintf(crcHex, "%02X", crc);
  packet += String(crcHex);
  
  // 7. Terminator
  packet += "D";
  
  return packet;
}

// Helper function to send packet in chunks
void sendPacket(String packet) {
  packet += "\n"; // Add newline for message delimiter
  
  // BLE has a maximum payload size (~20 bytes per notification)
  const int chunkSize = 20;
  int packetLength = packet.length();
  
  for (int i = 0; i < packetLength; i += chunkSize) {
    int endPos = min(i + chunkSize, packetLength);
    String chunk = packet.substring(i, endPos);
    
    pRxCharacteristic->setValue(chunk);
    pRxCharacteristic->notify();
    
    delay(10); // Small delay between chunks
  }
}

// ================= Callbacks =================
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer*) {
    deviceConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("Client connected");
  }

  void onDisconnect(BLEServer*) {
    deviceConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("Client disconnected");
  }
};

class MyTxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    String value = pCharacteristic->getValue();
    if (value.length()) {
      Serial.print("Command: ");
      Serial.println(value);
    }
  }
};

// ================= Setup =================
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  BLEDevice::init("TrackPatient-ESP32");
  BLEDevice::setMTU(185);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_TX_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pTxCharacteristic->setCallbacks(new MyTxCallbacks());

  pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_RX_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pRxCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  // Initialize previous data with zeros
  prevData.lat4 = "0000";
  prevData.lat4_2 = "0000";
  prevData.lon4 = "0000";
  prevData.lon4_2 = "0000";
  prevData.vel5 = "00000";
  prevData.vel5_2 = "00000";

  Serial.println("BLE Started");
}

// ================= Loop =================
void loop() {
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  if (deviceConnected) {
    unsigned long now = millis();
    
    // Send Live packet (L) every 1 second
    if (now - lastLiveTime >= LIVE_INTERVAL) {
      String packet = generateLivePacket();
      Serial.println("=== Sending Live Packet (L) ===");
      Serial.print("Packet: ");
      Serial.println(packet);
      sendPacket(packet);
      Serial.println("============================");
      lastLiveTime = now;
    }
    
    // Send Total packet (T) every 2 seconds
    if (now - lastTotalTime >= TOTAL_INTERVAL) {
      String packet = generateTotalPacket();
      Serial.println("=== Sending Total Packet (T) ===");
      Serial.print("Packet: ");
      Serial.println(packet);
      sendPacket(packet);
      Serial.println("============================");
      lastTotalTime = now;
    }
    
    // Send Status packet (S) every 10 seconds (or immediately on first connection)
    if (now - lastStatusTime >= STATUS_INTERVAL || lastStatusTime == 0) {
      String packet = generateStatusPacket();
      Serial.println("=== Sending Status Packet (S) ===");
      Serial.print("Packet: ");
      Serial.println(packet);
      sendPacket(packet);
      Serial.println("============================");
      lastStatusTime = now;
    }
  }

  delay(100);
}
