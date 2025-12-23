# ESP32 BLE Server Setup Guide

This guide will help you set up your ESP32 board to act as a BLE server that sends dummy patient data to the React Native app.

## Prerequisites

1. **Arduino IDE** installed on your computer
2. **ESP32 Board Support** installed in Arduino IDE
3. **ESP32 BLE Arduino Library** (usually included with ESP32 board support)

## Installation Steps

### 1. Install ESP32 Board Support in Arduino IDE

1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search for "ESP32" and install "esp32" by Espressif Systems
6. Select your board: **Tools → Board → ESP32 Arduino → ESP32 Dev Module**

### 2. Install Required Libraries

The ESP32 BLE libraries are usually included with the board support package. If not, you can install them via:
- **Tools → Manage Libraries → Search for "ESP32 BLE Arduino"**

### 3. Upload the Code

1. Open `esp32_ble_server.ino` in Arduino IDE
2. Connect your ESP32 board to your computer via USB
3. Select the correct **Port**: **Tools → Port → [Your ESP32 Port]**
4. Click **Upload** (or press `Ctrl+U` / `Cmd+U`)

### 4. Monitor Serial Output

1. Open **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see:
   ```
   Starting ESP32 BLE Server...
   BLE Server started and advertising!
   Waiting for a client connection to notify...
   ```

## How It Works

### Service and Characteristics

- **Service UUID**: `12345678-1234-1234-1234-1234567890ab`
- **TX Characteristic** (`12345678-1234-1234-1234-1234567890ac`): 
  - Used to receive commands from the app
  - Supports WRITE operations
- **RX Characteristic** (`12345678-1234-1234-1234-1234567890ad`):
  - Used to send data to the app
  - Supports READ and NOTIFY operations

### Data Format

The ESP32 sends JSON data in the following format:

```json
{
  "timestamp":"12345",
  "gps":{
    "lat":41.015123,
    "lon":28.979456,
    "speedKmh":5.2,
    "distanceTotalM":123
  },
  "heart":{
    "bpm":85,
    "rrMs":700,
    "maxBpmSession":95
  },
  "movement":{
    "metabolicPowerWkg":4.5,
    "activityZone":"Z3",
    "stepBalanceSide":"left",
    "stepBalancePercent":5.2
  },
  "temperature":{
    "skinC":36.7
  }
}
```

### Data Transmission

- Data is sent every **2 seconds** when a device is connected
- Each data packet contains randomly generated dummy patient data
- The app receives this data via BLE notifications

## Testing

1. **Upload the code** to your ESP32
2. **Open the React Native app** on your phone
3. **Switch to Production Mode** (toggle the switch)
4. **Tap "Scan for Devices"**
5. You should see **"ESP32"** in the device list
6. **Tap on ESP32** to connect
7. Once connected, you should see data logs appearing in the app every 2 seconds

## Troubleshooting

### ESP32 Not Appearing in Scan

- Make sure the ESP32 is powered on and the code is uploaded
- Check Serial Monitor to confirm "BLE Server started and advertising!"
- Try restarting the ESP32 (unplug and replug USB)
- Make sure Bluetooth is enabled on your phone

### Connection Fails

- Check Serial Monitor for error messages
- Make sure the ESP32 is not connected to another device
- Try restarting both the ESP32 and the app

### No Data Received

- Check Serial Monitor - you should see "Sent data: ..." messages
- Verify the connection is established (check app logs)
- Make sure notifications are enabled on the RX characteristic

## Customization

### Change Data Transmission Interval

In `esp32_ble_server.ino`, modify the delay in the `loop()` function:

```cpp
delay(2000); // Change 2000 to your desired interval in milliseconds
```

### Modify Data Generation

Edit the `generateDummyData()` function to customize the data ranges or add new fields.

### Change Device Name

In `setup()`, modify:

```cpp
BLEDevice::init("ESP32"); // Change "ESP32" to your desired name
```

## Notes

- The ESP32 will automatically restart advertising if disconnected
- Data is generated randomly each time - it's not stored or persistent
- The device name "ESP32" will appear in the app's device scanner
- Make sure your ESP32 has enough power (USB connection recommended)

