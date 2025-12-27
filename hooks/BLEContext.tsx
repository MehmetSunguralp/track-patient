import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

// Conditionally import BLE module - lazy initialization to avoid errors in Expo Go
let BleManager: any;
let Device: any;
let State: any;
let isBLEAvailable = false;
let bleModuleChecked = false;

// Lazy check for BLE availability
const checkBLEAvailability = () => {
  if (bleModuleChecked) {
    return isBLEAvailable;
  }

  bleModuleChecked = true;

  try {
    // Try to require the module - this will fail in Expo Go
    const bleModule = require('react-native-ble-plx');
    if (bleModule && bleModule.BleManager) {
      BleManager = bleModule.BleManager;
      Device = bleModule.Device;
      State = bleModule.State;
      isBLEAvailable = true;
      return true;
    }
  } catch (error) {
    // Module not available - likely in Expo Go
    // Silently fail - this is expected in Expo Go
    isBLEAvailable = false;
    // Don't log warnings - this is expected behavior in Expo Go
  }
  return false;
};

interface BLEDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  device: any; // Device type from react-native-ble-plx
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'data' | 'error' | 'info';
  message: string;
  data?: any;
}

interface BLEContextValue {
  readonly isScanning: boolean;
  readonly devices: BLEDevice[];
  readonly connectedDevice: any | null; // Device type from react-native-ble-plx
  readonly isConnecting: boolean;
  readonly error: string | null;
  readonly isAvailable: boolean;
  readonly logs: LogEntry[];
  readonly receivedData: string; // Last received data string
  readonly rawDataLogs: string[]; // Raw incoming data chunks
  readonly startScan: () => Promise<void>;
  readonly stopScan: () => void;
  readonly connectToDevice: (deviceId: string) => Promise<void>;
  readonly disconnectDevice: () => Promise<void>;
  readonly clearDevices: () => void;
  readonly clearLogs: () => void;
  readonly sendData: (data: string) => Promise<void>; // Send data to connected device
}

const BLEContext = createContext<BLEContextValue | undefined>(undefined);

interface BLEProviderProps {
  readonly children: ReactNode;
}

export function BLEProvider({ children }: BLEProviderProps) {
  const [manager] = useState(() => {
    // Check availability on first render
    const available = checkBLEAvailability();
    if (available && BleManager) {
      try {
        return new BleManager();
      } catch (error) {
        // Silently fail - expected in Expo Go
        return null;
      }
    }
    return null;
  });
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [receivedData, setReceivedData] = useState<string>('');
  const [rawDataLogs, setRawDataLogs] = useState<string[]>([]);
  const [dataBuffer, setDataBuffer] = useState<string>('');
  const dataBufferRef = useRef<string>('');
  const [nusService, setNusService] = useState<any | null>(null);
  const [nusTxCharacteristic, setNusTxCharacteristic] = useState<any | null>(null);
  const [nusRxCharacteristic, setNusRxCharacteristic] = useState<any | null>(null);
  const [esp32Service, setEsp32Service] = useState<any | null>(null);
  const [esp32TxCharacteristic, setEsp32TxCharacteristic] = useState<any | null>(null);
  const [esp32RxCharacteristic, setEsp32RxCharacteristic] = useState<any | null>(null);
  const [deviceType, setDeviceType] = useState<'nus' | 'esp32' | null>(null);
  const [error, setError] = useState<string | null>(() => {
    const available = checkBLEAvailability();
    // Only show error if BLE is not available, not on initial load
    return null;
  });

  // Nordic UART Service UUIDs
  const NUS_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  const NUS_TX_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // Write/Command
  const NUS_RX_CHARACTERISTIC_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // Notify/Data

  // ESP32 Custom Service UUIDs
  const ESP32_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
  const ESP32_TX_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-1234567890ac'; // Write/Command (from app to ESP32)
  const ESP32_RX_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-1234567890ad'; // Notify/Data (from ESP32 to app)

  // Base64 helper functions for React Native
  const base64ToUtf8 = (base64: string): string => {
    try {
      // Try using global atob if available (polyfill or web)
      if (typeof atob !== 'undefined') {
        return atob(base64);
      }
      // Fallback: manual base64 decoding
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = '';
      let i = 0;
      base64 = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');
      while (i < base64.length) {
        const enc1 = chars.indexOf(base64.charAt(i++));
        const enc2 = chars.indexOf(base64.charAt(i++));
        const enc3 = chars.indexOf(base64.charAt(i++));
        const enc4 = chars.indexOf(base64.charAt(i++));
        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;
        str += String.fromCharCode(chr1);
        if (enc3 !== 64) str += String.fromCharCode(chr2);
        if (enc4 !== 64) str += String.fromCharCode(chr3);
      }
      return str;
    } catch (error) {
      return base64; // Return as-is if decoding fails
    }
  };

  const utf8ToBase64 = (str: string): string => {
    try {
      // Try using global btoa if available (polyfill or web)
      if (typeof btoa !== 'undefined') {
        return btoa(unescape(encodeURIComponent(str)));
      }
      // Fallback: manual base64 encoding
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      let i = 0;

      // Convert string to UTF-8 bytes manually
      const utf8Bytes: number[] = [];
      for (let j = 0; j < str.length; j++) {
        const charCode = str.charCodeAt(j);
        if (charCode < 0x80) {
          utf8Bytes.push(charCode);
        } else if (charCode < 0x800) {
          utf8Bytes.push(0xc0 | (charCode >> 6));
          utf8Bytes.push(0x80 | (charCode & 0x3f));
        } else {
          utf8Bytes.push(0xe0 | (charCode >> 12));
          utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3f));
          utf8Bytes.push(0x80 | (charCode & 0x3f));
        }
      }

      while (i < utf8Bytes.length) {
        const chr1 = utf8Bytes[i++];
        const chr2 = utf8Bytes[i++];
        const chr3 = utf8Bytes[i++];
        const enc1 = chr1 >> 2;
        const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        let enc4 = chr3 & 63;
        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
          enc4 = 64;
        }
        output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
      }
      return output;
    } catch (error) {
      // If encoding fails, return a simple base64 representation
      // This is a fallback - in production you might want to use a library
      return str;
    }
  };

  // Helper function to add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string, data?: any) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    };
    setLogs((prev) => [...prev, logEntry]);
  }, []);

  // Request permissions
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true; // iOS permissions are handled in Info.plist
  };

  const startScan = useCallback(async () => {
    const available = checkBLEAvailability();
    if (!available || !manager) {
      setError('Bluetooth Low Energy is not available. Please use a development build.');
      return;
    }

    try {
      setError(null);
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError('Bluetooth permissions denied');
        return;
      }

      // Check if Bluetooth is enabled
      const state = await manager.state();
      if (state !== State.PoweredOn) {
        setError('Bluetooth is not enabled. Please enable Bluetooth and try again.');
        return;
      }

      setIsScanning(true);
      setDevices([]);
      addLog('info', 'Starting scan for BLE devices (NUS and ESP32)...');

      // Scan for both NUS and ESP32 service UUIDs
      manager.startDeviceScan(
        [NUS_SERVICE_UUID, ESP32_SERVICE_UUID],
        { allowDuplicates: false },
        (scanError: any, device: any) => {
          if (scanError) {
            setError(scanError.message);
            setIsScanning(false);
            addLog('error', 'Scan error', scanError.message);
            return;
          }

          if (device) {
            setDevices((prevDevices) => {
              // Avoid duplicates
              const existingIndex = prevDevices.findIndex((d) => d.id === device.id);
              // Prefer advertised local name if available, then device name
              const displayName = (device as any).localName ?? device.name ?? null;
              if (existingIndex >= 0) {
                // Update existing device
                const updated = [...prevDevices];
                updated[existingIndex] = {
                  id: device.id,
                  name: displayName,
                  rssi: device.rssi,
                  device,
                };
                return updated;
              }
              // Add new device
              // Determine device type from advertised services
              const deviceType = device.serviceUUIDs?.some((uuid: string) =>
                uuid.toUpperCase().includes(ESP32_SERVICE_UUID.replace(/-/g, '').substring(0, 8))
              )
                ? 'esp32'
                : 'nus';
              addLog(
                'info',
                `Found ${deviceType.toUpperCase()} device: ${displayName || 'Unknown'} (${
                  device.id
                })`
              );
              return [
                ...prevDevices,
                {
                  id: device.id,
                  name: displayName,
                  rssi: device.rssi,
                  device,
                },
              ];
            });
          }
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scanning';
      setError(errorMessage);
      setIsScanning(false);
    }
  }, [manager]);

  const stopScan = useCallback(() => {
    const available = checkBLEAvailability();
    if (!available || !manager) {
      return;
    }
    manager.stopDeviceScan();
    setIsScanning(false);
  }, [manager]);

  const connectToDevice = useCallback(
    async (deviceId: string) => {
      const available = checkBLEAvailability();
      if (!available || !manager) {
        setError('Bluetooth Low Energy is not available. Please use a development build.');
        return;
      }

      try {
        setError(null);
        setIsConnecting(true);

        // Stop scanning if active
        if (isScanning) {
          stopScan();
        }

        const device = await manager.connectToDevice(deviceId);
        setConnectedDevice(device);
        addLog('info', `Connected to device: ${device.name || deviceId}`);

        // Discover services and characteristics
        await device.discoverAllServicesAndCharacteristics();
        addLog('info', 'Services and characteristics discovered');

        // Find service (NUS or ESP32)
        const services = await device.services();
        addLog('info', `Found ${services.length} service(s)`);

        let foundService = null;
        let detectedDeviceType: 'nus' | 'esp32' | null = null;

        for (const service of services) {
          if (!service) continue;

          const serviceUuid = service.uuid.toUpperCase();

          // Check for NUS service
          if (
            serviceUuid === NUS_SERVICE_UUID.toUpperCase() ||
            serviceUuid.includes('6E400001') ||
            serviceUuid.replace(/-/g, '').includes('6E400001')
          ) {
            foundService = service;
            detectedDeviceType = 'nus';
            setNusService(service);
            setDeviceType('nus');
            addLog('info', `Found NUS service: ${service.uuid}`);
            break;
          }

          // Check for ESP32 service
          if (
            serviceUuid === ESP32_SERVICE_UUID.toUpperCase() ||
            serviceUuid.includes('12345678') ||
            serviceUuid.replace(/-/g, '').includes('12345678')
          ) {
            foundService = service;
            detectedDeviceType = 'esp32';
            setEsp32Service(service);
            setDeviceType('esp32');
            addLog('info', `Found ESP32 service: ${service.uuid}`);
            break;
          }
        }

        if (!foundService || !detectedDeviceType) {
          addLog('error', 'Supported service (NUS or ESP32) not found on device.');
          setIsConnecting(false);
          return;
        }

        // Get characteristics from the found service
        const characteristics = await foundService.characteristics();
        addLog(
          'info',
          `${detectedDeviceType.toUpperCase()} service: Found ${
            characteristics.length
          } characteristic(s)`
        );

        let txChar = null;
        let rxChar = null;

        for (const characteristic of characteristics) {
          if (!characteristic) continue;

          const charUuid = characteristic.uuid.toUpperCase();

          if (detectedDeviceType === 'nus') {
            // NUS TX Characteristic (for writing commands)
            if (
              charUuid === NUS_TX_CHARACTERISTIC_UUID.toUpperCase() ||
              charUuid.includes('6E400002') ||
              charUuid.replace(/-/g, '').includes('6E400002')
            ) {
              txChar = characteristic;
              setNusTxCharacteristic(characteristic);
              addLog('info', `Found NUS TX characteristic (write): ${characteristic.uuid}`);
            }

            // NUS RX Characteristic (for receiving data)
            if (
              charUuid === NUS_RX_CHARACTERISTIC_UUID.toUpperCase() ||
              charUuid.includes('6E400003') ||
              charUuid.replace(/-/g, '').includes('6E400003')
            ) {
              rxChar = characteristic;
              setNusRxCharacteristic(characteristic);
              addLog('info', `Found NUS RX characteristic (notify): ${characteristic.uuid}`);
            }
          } else if (detectedDeviceType === 'esp32') {
            // ESP32 TX Characteristic (for writing commands from app to ESP32)
            const txUuidUpper = ESP32_TX_CHARACTERISTIC_UUID.toUpperCase();
            if (
              charUuid === txUuidUpper ||
              charUuid.includes('1234567890ac') ||
              charUuid.replace(/-/g, '').includes('1234567890ac')
            ) {
              txChar = characteristic;
              setEsp32TxCharacteristic(characteristic);
              addLog('info', `Found ESP32 TX characteristic (write): ${characteristic.uuid}`);
            }

            // ESP32 RX Characteristic (for receiving data from ESP32)
            const rxUuidUpper = ESP32_RX_CHARACTERISTIC_UUID.toUpperCase();
            if (
              charUuid === rxUuidUpper ||
              charUuid.includes('1234567890ad') ||
              charUuid.replace(/-/g, '').includes('1234567890ad')
            ) {
              rxChar = characteristic;
              setEsp32RxCharacteristic(characteristic);
              addLog('info', `Found ESP32 RX characteristic (notify): ${characteristic.uuid}`);
            }
          }
        }

        if (!txChar || !rxChar) {
          addLog('error', `${detectedDeviceType.toUpperCase()} TX or RX characteristics not found`);
          setIsConnecting(false);
          return;
        }

        // Enable notifications on RX characteristic to receive data
        try {
          await rxChar.monitor((error: any, char: any) => {
            if (error) {
              addLog('error', `Error monitoring RX characteristic`, error.message);
              return;
            }
            if (char && char.value) {
              try {
                // Decode base64 to string (react-native-ble-plx returns base64)
                const base64Value = char.value;
                const decodedString = base64ToUtf8(base64Value);
                
                // Store raw data chunk
                setRawDataLogs((prev) => {
                  const newLogs = [...prev, decodedString];
                  // Keep only last 1000 chunks to prevent memory issues
                  return newLogs.slice(-1000);
                });
                
                const chunkLog = `[BLE Monitor] Received chunk, length: ${
                  decodedString.length
                }, preview: ${decodedString.substring(0, 50)}`;
                console.log(chunkLog);

                // Accumulate chunks in buffer and extract complete JSON messages
                // Use ref for synchronous access to avoid race conditions with rapid chunks
                dataBufferRef.current = dataBufferRef.current + decodedString;
                let workingBuffer = dataBufferRef.current;

                // Debug: log buffer state
                const hasNewline = workingBuffer.includes('\n');
                const lastChars =
                  workingBuffer.length > 0
                    ? workingBuffer.substring(Math.max(0, workingBuffer.length - 10))
                    : '';

                const bufferLog = `[BLE Buffer] Buffer length: ${
                  workingBuffer.length
                }, has newline: ${hasNewline}, last 10 chars: "${lastChars.replace(
                  /\n/g,
                  '\\n'
                )}"`;
                console.log(bufferLog);
                // Only log buffer state if buffer is significant (> 100 chars) to avoid spam
                if (workingBuffer.length > 100) {
                  addLog('info', bufferLog, {
                    bufferLength: workingBuffer.length,
                    hasNewline,
                    lastChars: lastChars.replace(/\n/g, '\\n'),
                    preview: workingBuffer.substring(0, 100),
                  });
                }

                // If buffer is getting large but no newline, check for complete JSON
                // BLE might split the message, so we need to detect complete JSON objects
                if (workingBuffer.length > 50 && !hasNewline) {
                  // Debug: Check if we're receiving duplicate chunks
                  const first20 = workingBuffer.substring(0, 20);
                  const second20 = workingBuffer.substring(20, 40);
                  if (first20 === second20 && workingBuffer.length >= 40) {
                    console.log(
                      `[BLE Buffer] ⚠️ WARNING: Receiving duplicate chunks! First 20 chars repeated.`
                    );
                    console.log(`[BLE Buffer] First chunk: "${first20}"`);
                    console.log(
                      `[BLE Buffer] This suggests ESP32 is sending the same data repeatedly.`
                    );
                    // Clear buffer to prevent infinite growth
                    workingBuffer = first20; // Keep only one copy
                    dataBufferRef.current = first20;
                    console.log(`[BLE Buffer] Reset buffer to single chunk to prevent overflow`);
                  }

                  // Try to find a complete JSON object in the buffer
                  // Look for matching braces to find complete JSON
                  let braceCount = 0;
                  let jsonStart = -1;
                  let jsonEnd = -1;

                  for (let i = 0; i < workingBuffer.length; i++) {
                    if (workingBuffer[i] === '{') {
                      if (braceCount === 0) jsonStart = i;
                      braceCount++;
                    } else if (workingBuffer[i] === '}') {
                      braceCount--;
                      if (braceCount === 0 && jsonStart !== -1) {
                        jsonEnd = i;
                        // Found a complete JSON object!
                        const completeJson = workingBuffer.substring(jsonStart, jsonEnd + 1);
                        console.log(
                          `[BLE Buffer] ✅ Found complete JSON (${completeJson.length} chars) without newline, processing...`
                        );
                        console.log(
                          `[BLE Buffer] JSON: "${completeJson.substring(0, 150)}${
                            completeJson.length > 150 ? '...' : ''
                          }"`
                        );

                        // Process this JSON
                        const completeMessage = completeJson.trim();
                        if (completeMessage.length > 0) {
                          console.log(
                            `[BLE] ✅ Received complete message (${
                              completeMessage.length
                            } chars): "${completeMessage.substring(0, 100)}${
                              completeMessage.length > 100 ? '...' : ''
                            }"`
                          );

                          addLog('data', `📨 Received JSON (${completeMessage.length} chars)`, {
                            message: completeMessage,
                            length: completeMessage.length,
                            timestamp: new Date().toISOString(),
                            preview: completeMessage.substring(0, 100),
                          });

                          setReceivedData(`${completeMessage}|${Date.now()}`);
                        }

                        // Remove processed JSON from buffer
                        workingBuffer = workingBuffer.substring(jsonEnd + 1);
                        break; // Process one JSON at a time
                      }
                    }
                  }
                }

                // Prevent buffer overflow (max 10KB)
                if (workingBuffer.length > 10000) {
                  addLog('error', 'Data buffer overflow, resetting');
                  console.log(
                    `[BLE Buffer] Overflow! Buffer content: ${workingBuffer.substring(0, 200)}`
                  );
                  workingBuffer = '';
                  dataBufferRef.current = '';
                }

                // Process all complete messages
                // Packets can be delimited by \n OR end with 'D' (ASCII packet terminator)
                let processed = true;

                while (processed) {
                  processed = false;

                  // First, try to find newline-delimited messages
                  const newlineIndex = workingBuffer.indexOf('\n');
                  if (newlineIndex !== -1) {
                    const completeMessage = workingBuffer.substring(0, newlineIndex).trim();
                    workingBuffer = workingBuffer.substring(newlineIndex + 1);

                    if (completeMessage.length > 0) {
                      console.log(
                        `[BLE] ✅ Received complete message (${
                          completeMessage.length
                        } chars): "${completeMessage.substring(0, 100)}${
                          completeMessage.length > 100 ? '...' : ''
                        }"`
                      );

                      // Determine message type
                      const messageType = completeMessage.startsWith('{')
                        ? 'JSON'
                        : completeMessage.match(/^[LTS]/)
                        ? 'ASCII_PACKET'
                        : 'UNKNOWN';

                      addLog(
                        'data',
                        `📨 Received ${messageType} (${completeMessage.length} chars)`,
                        {
                          message: completeMessage,
                          length: completeMessage.length,
                          timestamp: new Date().toISOString(),
                          preview: completeMessage.substring(0, 100),
                          type: messageType,
                        }
                      );

                      setReceivedData(`${completeMessage}|${Date.now()}`);
                      processed = true;
                      continue;
                    }
                  }

                  // If no newline, check for ASCII packet ending with 'D' or 'DD' (terminator)
                  // Live packets (L) end with 'DD', Total/Status packets (T/S) end with 'D'
                  // Use greedy matching to get to the end, then check for terminator
                  let completePacket: string | null = null;
                  
                  // Try to match Live packet (L...DD) - must end with DD
                  if (workingBuffer.startsWith('L') && workingBuffer.includes('DD')) {
                    const ddIndex = workingBuffer.indexOf('DD');
                    // Make sure DD is at the end (or followed by newline/end of buffer)
                    if (ddIndex > 0 && (ddIndex + 2 === workingBuffer.length || workingBuffer[ddIndex + 2] === '\n')) {
                      completePacket = workingBuffer.substring(0, ddIndex + 2);
                    }
                  }
                  
                  // Try to match Total/Status packet (T...D or S...D) - must end with D (not DD)
                  if (!completePacket && (workingBuffer.startsWith('T') || workingBuffer.startsWith('S'))) {
                    // Find the last 'D' that's not part of 'DD'
                    let lastDIndex = -1;
                    for (let i = workingBuffer.length - 1; i >= 0; i--) {
                      if (workingBuffer[i] === 'D') {
                        // Check if it's not part of DD (i.e., previous char is not D)
                        if (i === 0 || workingBuffer[i - 1] !== 'D') {
                          lastDIndex = i;
                          break;
                        }
                      }
                    }
                    if (lastDIndex > 0) {
                      completePacket = workingBuffer.substring(0, lastDIndex + 1);
                    }
                  }
                  
                  if (completePacket) {
                    workingBuffer = workingBuffer.substring(completePacket.length);

                    console.log(
                      `[BLE] ✅ Received complete ASCII packet (${
                        completePacket.length
                      } chars): "${completePacket.substring(0, 100)}${
                        completePacket.length > 100 ? '...' : ''
                      }"`
                    );
                    console.log(`[BLE] Full packet: ${completePacket}`);

                    addLog('data', `📨 Received ASCII packet (${completePacket.length} chars)`, {
                      message: completePacket,
                      length: completePacket.length,
                      timestamp: new Date().toISOString(),
                      preview: completePacket.substring(0, 100),
                      type: 'ASCII_PACKET',
                    });

                    // Send to PatientsContext for parsing
                    setReceivedData(`${completePacket}|${Date.now()}`);
                    processed = true;
                  }
                }

                // Log if buffer has data but no newline yet
                if (workingBuffer.length > 0 && !workingBuffer.includes('\n')) {
                  const waitingLog = `[BLE Buffer] Waiting for more data... buffer has ${
                    workingBuffer.length
                  } chars, preview: "${workingBuffer.substring(0, 50)}..."`;
                  console.log(waitingLog);
                  // Only log if buffer is significant to avoid spam
                  if (workingBuffer.length > 200) {
                    addLog('info', waitingLog, {
                      bufferLength: workingBuffer.length,
                      preview: workingBuffer.substring(0, 100),
                    });
                  }
                }

                // Update ref with remaining buffer (incomplete message or empty)
                dataBufferRef.current = workingBuffer;
                setDataBuffer(workingBuffer);
              } catch (decodeError) {
                addLog('error', 'Error decoding received data', String(decodeError));
              }
            }
          });
          addLog(
            'info',
            `${detectedDeviceType?.toUpperCase()} RX characteristic monitoring enabled - ready to receive data`
          );
        } catch (monitorError) {
          addLog('error', 'Failed to enable RX monitoring', String(monitorError));
        }

        // Monitor connection state
        device.onDisconnected(() => {
          setConnectedDevice(null);
          setNusService(null);
          setNusTxCharacteristic(null);
          setNusRxCharacteristic(null);
          setEsp32Service(null);
          setEsp32TxCharacteristic(null);
          setEsp32RxCharacteristic(null);
          setDeviceType(null);
          setReceivedData('');
          setRawDataLogs([]);
          setError('Device disconnected');
          addLog('info', 'Device disconnected');
        });

        setIsConnecting(false);
        addLog(
          'info',
          `${detectedDeviceType.toUpperCase()} connection established and ready for communication`
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to device';
        setError(errorMessage);
        addLog('error', 'Connection failed', errorMessage);
        setIsConnecting(false);
      }
    },
    [
      manager,
      isScanning,
      stopScan,
      addLog,
      NUS_SERVICE_UUID,
      ESP32_SERVICE_UUID,
      NUS_TX_CHARACTERISTIC_UUID,
      NUS_RX_CHARACTERISTIC_UUID,
      ESP32_TX_CHARACTERISTIC_UUID,
      ESP32_RX_CHARACTERISTIC_UUID,
      base64ToUtf8,
    ]
  );

  const disconnectDevice = useCallback(async () => {
    // NOTE: We cannot safely call cancelConnection() as it causes app crashes
    // Instead, we just clear all state. The ESP32 will detect the disconnection
    // when it stops receiving data, or the connection will timeout naturally.
    // The onDisconnected callback will also fire when the device disconnects.

    // Clear all state immediately
    setConnectedDevice(null);
    setNusService(null);
    setNusTxCharacteristic(null);
    setNusRxCharacteristic(null);
    setEsp32Service(null);
    setEsp32TxCharacteristic(null);
    setEsp32RxCharacteristic(null);
    setDeviceType(null);
    setReceivedData('');
    setRawDataLogs([]);
    setDataBuffer('');
    dataBufferRef.current = '';
    setError(null);
    setIsConnecting(false);

    addLog('info', 'Device disconnected (state cleared - ESP32 will detect disconnection)');
  }, [addLog]);

  const sendData = useCallback(
    async (data: string) => {
      // Determine which TX characteristic to use based on device type
      const txChar = deviceType === 'esp32' ? esp32TxCharacteristic : nusTxCharacteristic;

      if (!connectedDevice || !txChar) {
        addLog('error', 'Cannot send data: Not connected or TX characteristic not available');
        return;
      }

      try {
        // Convert string to base64 for BLE transmission
        const base64Data = utf8ToBase64(data);

        // Write to TX characteristic (without response for better performance)
        // Some devices prefer writeWithoutResponse, but we'll try with response first
        try {
          await txChar.writeWithResponse(base64Data);
        } catch {
          // Fallback to write without response if with response fails
          await txChar.writeWithoutResponse(base64Data);
        }
        addLog('info', `Sent: ${data}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send data';
        addLog('error', 'Send data error', errorMessage);
        setError(errorMessage);
      }
    },
    [connectedDevice, deviceType, nusTxCharacteristic, esp32TxCharacteristic, addLog]
  );

  const clearDevices = useCallback(() => {
    setDevices([]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setRawDataLogs([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (manager) {
        try {
          manager.destroy();
        } catch (error) {
          // Silently fail on cleanup
        }
      }
    };
  }, [manager]);

  const value: BLEContextValue = useMemo(
    () => ({
      isScanning,
      devices,
      connectedDevice,
      isConnecting,
      error,
      isAvailable: checkBLEAvailability() && manager !== null,
      logs,
      receivedData,
      rawDataLogs,
      startScan,
      stopScan,
      connectToDevice,
      disconnectDevice,
      clearDevices,
      clearLogs,
      sendData,
    }),
    [
      isScanning,
      devices,
      connectedDevice,
      isConnecting,
      error,
      manager,
      logs,
      receivedData,
      rawDataLogs,
      startScan,
      stopScan,
      connectToDevice,
      disconnectDevice,
      clearDevices,
      clearLogs,
      sendData,
    ]
  );

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
}

export function useBLE() {
  const context = useContext(BLEContext);

  if (!context) {
    throw new Error('useBLE must be used within a BLEProvider');
  }

  return context;
}
