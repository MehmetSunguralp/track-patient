import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

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
  readonly startScan: () => Promise<void>;
  readonly stopScan: () => void;
  readonly connectToDevice: (deviceId: string) => Promise<void>;
  readonly disconnectDevice: () => Promise<void>;
  readonly clearDevices: () => void;
  readonly clearLogs: () => void;
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
  const [error, setError] = useState<string | null>(() => {
    const available = checkBLEAvailability();
    // Only show error if BLE is not available, not on initial load
    return null;
  });

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
        return granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
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

      manager.startDeviceScan(null, null, (scanError, device) => {
        if (scanError) {
          setError(scanError.message);
          setIsScanning(false);
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
      });
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

        // Get all services and characteristics for monitoring
        const services = await device.services();
        addLog('info', `Found ${services.length} service(s)`);

        // Monitor all characteristics that support notifications
        for (const service of services) {
          try {
            const characteristics = await service.characteristics();
            addLog('info', `Service ${service.uuid}: Found ${characteristics.length} characteristic(s)`);

            for (const characteristic of characteristics) {
              // Check if characteristic supports notifications or indications
              const properties = characteristic.properties;
              if (properties.notify || properties.indicate) {
                try {
                  // Monitor this characteristic
                  characteristic.monitor((error, char) => {
                    if (error) {
                      addLog('error', `Error monitoring characteristic ${characteristic.uuid}`, error.message);
                      return;
                    }
                    if (char && char.value) {
                      // Decode the value (assuming it's base64 encoded)
                      try {
                        const base64Value = char.value;
                        // You can decode this based on your device's data format
                        addLog('data', `Data from ${characteristic.uuid}`, {
                          service: service.uuid,
                          characteristic: characteristic.uuid,
                          value: base64Value,
                          base64Length: base64Value.length,
                        });
                      } catch (decodeError) {
                        addLog('error', `Error decoding data from ${characteristic.uuid}`, String(decodeError));
                      }
                    }
                  });
                  addLog('info', `Monitoring characteristic ${characteristic.uuid}`);
                } catch (monitorError) {
                  addLog('error', `Failed to monitor ${characteristic.uuid}`, String(monitorError));
                }
              }
            }
          } catch (serviceError) {
            addLog('error', `Error reading characteristics from service ${service.uuid}`, String(serviceError));
          }
        }

        // Monitor connection state
        device.onDisconnected(() => {
          setConnectedDevice(null);
          setError('Device disconnected');
          addLog('info', 'Device disconnected');
        });

        setIsConnecting(false);
        addLog('info', 'Connection established and monitoring started');
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
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect device';
      setError(errorMessage);
    }
  }, [connectedDevice]);

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

  const value: BLEContextValue = {
    isScanning,
    devices,
    connectedDevice,
    isConnecting,
    error,
    isAvailable: checkBLEAvailability() && manager !== null,
    logs,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    clearDevices,
    clearLogs,
  };

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
}

export function useBLE() {
  const context = useContext(BLEContext);

  if (!context) {
    throw new Error('useBLE must be used within a BLEProvider');
  }

  return context;
}

