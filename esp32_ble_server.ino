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
#define PATIENT_ID "p1"

struct PatientData {
  float lat;
  float lon;
  float speedKmh;
  int distanceTotalM;
  int bpm;
  int rrMs;
  int maxBpmSession;
  float metabolicPowerWkg;
  String activityZone;
  String stepBalanceSide;
  float stepBalancePercent;
  float skinC;
};

PatientData currentData;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 5000;

// ================= Dummy Data =================
PatientData generateDummyData() {
  PatientData d;

  d.lat = 41.015 + random(-50, 50) / 1000.0;
  d.lon = 28.979 + random(-50, 50) / 1000.0;
  d.speedKmh = random(10, 80) / 10.0;
  d.distanceTotalM = random(0, 5000);

  d.bpm = random(60, 140);
  d.rrMs = random(450, 1000);
  d.maxBpmSession = random(100, 160);

  d.metabolicPowerWkg = random(10, 100) / 10.0;
  String zones[] = {"Z1", "Z2", "Z3", "Z4", "Z5", "Z6"};
  d.activityZone = zones[random(0, 6)];

  String sides[] = {"left", "right"};
  d.stepBalanceSide = sides[random(0, 2)];
  d.stepBalancePercent = random(10, 120) / 10.0;

  d.skinC = 36.0 + random(0, 20) / 10.0;

  return d;
}

// ================= JSON =================
String dataToJson(PatientData d) {
  String json = "{";

  json += "\"patientId\":\"" + String(PATIENT_ID) + "\",";
  json += "\"timestamp\":" + String(millis() / 1000) + ",";

  json += "\"gps\":{";
  json += "\"lat\":" + String(d.lat, 6) + ",";
  json += "\"lon\":" + String(d.lon, 6) + ",";
  json += "\"speedKmh\":" + String(d.speedKmh, 1) + ",";
  json += "\"distanceTotalM\":" + String(d.distanceTotalM);
  json += "},";

  json += "\"heart\":{";
  json += "\"bpm\":" + String(d.bpm) + ",";
  json += "\"rrMs\":" + String(d.rrMs) + ",";
  json += "\"maxBpmSession\":" + String(d.maxBpmSession);
  json += "},";

  json += "\"movement\":{";
  json += "\"metabolicPowerWkg\":" + String(d.metabolicPowerWkg, 1) + ",";
  json += "\"activityZone\":\"" + d.activityZone + "\",";
  json += "\"stepBalanceSide\":\"" + d.stepBalanceSide + "\",";
  json += "\"stepBalancePercent\":" + String(d.stepBalancePercent, 1);
  json += "},";

  json += "\"temperature\":{";
  json += "\"skinC\":" + String(d.skinC, 1);
  json += "}";

  json += "}";

  return json;
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
    if (now - lastSendTime >= 1000) { // Send every 1 second
      String message = "hello world\n";
      
      pRxCharacteristic->setValue(message);
      pRxCharacteristic->notify();

      Serial.print("Sent: ");
      Serial.print(message);
      lastSendTime = now;
    }
  }

  delay(100);
}
