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

interface BLEContextValue {
  readonly isScanning: boolean;
  readonly devices: BLEDevice[];
  readonly connectedDevice: any | null; // Device type from react-native-ble-plx
  readonly isConnecting: boolean;
  readonly error: string | null;
  readonly isAvailable: boolean;
  readonly startScan: () => Promise<void>;
  readonly stopScan: () => void;
  readonly connectToDevice: (deviceId: string) => Promise<void>;
  readonly disconnectDevice: () => Promise<void>;
  readonly clearDevices: () => void;
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
  const [error, setError] = useState<string | null>(() => {
    const available = checkBLEAvailability();
    // Only show error if BLE is not available, not on initial load
    return null;
  });

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
            if (existingIndex >= 0) {
              // Update existing device
              const updated = [...prevDevices];
              updated[existingIndex] = {
                id: device.id,
                name: device.name,
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
                name: device.name,
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

        // Discover services and characteristics
        await device.discoverAllServicesAndCharacteristics();

        // Monitor connection state
        device.onDisconnected(() => {
          setConnectedDevice(null);
          setError('Device disconnected');
        });

        setIsConnecting(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to device';
        setError(errorMessage);
        setIsConnecting(false);
      }
    },
    [manager, isScanning, stopScan]
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
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
    clearDevices,
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

