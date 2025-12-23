import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  const [nusService, setNusService] = useState<any | null>(null);
  const [nusTxCharacteristic, setNusTxCharacteristic] = useState<any | null>(null);
  const [nusRxCharacteristic, setNusRxCharacteristic] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(() => {
    const available = checkBLEAvailability();
    // Only show error if BLE is not available, not on initial load
    return null;
  });

  // Nordic UART Service UUIDs
  const NUS_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  const NUS_TX_CHARACTERISTIC_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // Write/Command
  const NUS_RX_CHARACTERISTIC_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // Notify/Data

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
      addLog('info', 'Starting scan for NUS (Nordic UART Service) devices...');

      // Scan specifically for NUS service UUID
      manager.startDeviceScan(
        [NUS_SERVICE_UUID],
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
              addLog('info', `Found NUS device: ${displayName || 'Unknown'} (${device.id})`);
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

        // Find Nordic UART Service (NUS) - Standard UUID: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
        const services = await device.services();
        addLog('info', `Found ${services.length} service(s)`);

        let foundNusService = null;
        for (const service of services) {
          if (!service) continue;

          // Check if this is the NUS service (case-insensitive, also check short UUID)
          const serviceUuid = service.uuid.toUpperCase();
          if (
            serviceUuid === NUS_SERVICE_UUID.toUpperCase() ||
            serviceUuid.includes('6E400001') ||
            serviceUuid.replace(/-/g, '').includes('6E400001')
          ) {
            foundNusService = service;
            setNusService(service);
            addLog('info', `Found NUS service: ${service.uuid}`);
            break;
          }
        }

        if (!foundNusService) {
          addLog('error', 'NUS service not found. Device may not support Nordic UART Service.');
          setIsConnecting(false);
          return;
        }

        // Get characteristics from NUS service
        const characteristics = await foundNusService.characteristics();
        addLog('info', `NUS service: Found ${characteristics.length} characteristic(s)`);

        let txChar = null;
        let rxChar = null;

        for (const characteristic of characteristics) {
          if (!characteristic) continue;

          const charUuid = characteristic.uuid.toUpperCase();

          // TX Characteristic (for writing commands) - UUID: 6E400002-B5A3-F393-E0A9-E50E24DCCA9E
          if (
            charUuid === NUS_TX_CHARACTERISTIC_UUID.toUpperCase() ||
            charUuid.includes('6E400002') ||
            charUuid.replace(/-/g, '').includes('6E400002')
          ) {
            txChar = characteristic;
            setNusTxCharacteristic(characteristic);
            addLog('info', `Found TX characteristic (write): ${characteristic.uuid}`);
          }

          // RX Characteristic (for receiving data) - UUID: 6E400003-B5A3-F393-E0A9-E50E24DCCA9E
          if (
            charUuid === NUS_RX_CHARACTERISTIC_UUID.toUpperCase() ||
            charUuid.includes('6E400003') ||
            charUuid.replace(/-/g, '').includes('6E400003')
          ) {
            rxChar = characteristic;
            setNusRxCharacteristic(characteristic);
            addLog('info', `Found RX characteristic (notify): ${characteristic.uuid}`);
          }
        }

        if (!txChar || !rxChar) {
          addLog('error', 'NUS TX or RX characteristics not found');
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

                setReceivedData(decodedString);
                addLog('data', 'Received data', {
                  raw: decodedString,
                  length: decodedString.length,
                  preview: decodedString.substring(0, 100),
                });
              } catch (decodeError) {
                addLog('error', 'Error decoding received data', String(decodeError));
              }
            }
          });
          addLog('info', 'RX characteristic monitoring enabled - ready to receive data');
        } catch (monitorError) {
          addLog('error', 'Failed to enable RX monitoring', String(monitorError));
        }

        // Monitor connection state
        device.onDisconnected(() => {
          setConnectedDevice(null);
          setNusService(null);
          setNusTxCharacteristic(null);
          setNusRxCharacteristic(null);
          setReceivedData('');
          setError('Device disconnected');
          addLog('info', 'Device disconnected');
        });

        setIsConnecting(false);
        addLog('info', 'NUS connection established and ready for communication');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to device';
        setError(errorMessage);
        addLog('error', 'Connection failed', errorMessage);
        setIsConnecting(false);
      }
    },
    [manager, isScanning, stopScan, addLog]
  );

  const disconnectDevice = useCallback(async () => {
    try {
      if (connectedDevice) {
        await connectedDevice.cancelConnection();
        setConnectedDevice(null);
        setNusService(null);
        setNusTxCharacteristic(null);
        setNusRxCharacteristic(null);
        setReceivedData('');
        setError(null);
        addLog('info', 'Device disconnected');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect device';
      setError(errorMessage);
      addLog('error', 'Disconnect error', errorMessage);
    }
  }, [connectedDevice, addLog]);

  const sendData = useCallback(
    async (data: string) => {
      if (!connectedDevice || !nusTxCharacteristic) {
        addLog('error', 'Cannot send data: Not connected or TX characteristic not available');
        return;
      }

      try {
        // Convert string to base64 for BLE transmission
        const base64Data = utf8ToBase64(data);

        // Write to TX characteristic (without response for better performance with NUS)
        // Some devices prefer writeWithoutResponse, but we'll try with response first
        try {
          await nusTxCharacteristic.writeWithResponse(base64Data);
        } catch {
          // Fallback to write without response if with response fails
          await nusTxCharacteristic.writeWithoutResponse(base64Data);
        }
        addLog('info', `Sent: ${data}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send data';
        addLog('error', 'Send data error', errorMessage);
        setError(errorMessage);
      }
    },
    [connectedDevice, nusTxCharacteristic, addLog]
  );

  const clearDevices = useCallback(() => {
    setDevices([]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
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
