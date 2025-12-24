import { useBLE } from '@/hooks/BLEContext';
import { ThemedView } from '@/components/themed-view';
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface BLEDeviceScannerProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onDeviceSelected?: (deviceId: string) => void;
}

export default function BLEDeviceScanner({
  visible,
  onClose,
  onDeviceSelected,
}: BLEDeviceScannerProps) {
  const {
    isScanning,
    devices,
    connectedDevice,
    isConnecting,
    error,
    isAvailable,
    startScan,
    stopScan,
    connectToDevice,
    disconnectDevice,
  } = useBLE();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const previousDeviceIdRef = useRef<string | null>(null);

  // Close modal 500ms after NEW device connection (not if already connected)
  useEffect(() => {
    if (connectedDevice && visible) {
      const currentDeviceId = connectedDevice.id;
      // Only auto-close if this is a NEW connection (device ID changed)
      if (previousDeviceIdRef.current !== currentDeviceId) {
        previousDeviceIdRef.current = currentDeviceId;
        const timer = setTimeout(() => {
          onClose();
        }, 500);
        return () => clearTimeout(timer);
      }
    } else if (!connectedDevice) {
      // Reset when disconnected
      previousDeviceIdRef.current = null;
    }
  }, [connectedDevice, visible, onClose]);

  const handleStartScan = async () => {
    await startScan();
  };

  const handleStopScan = () => {
    stopScan();
  };

  const handleConnect = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      await connectToDevice(deviceId);
      if (onDeviceSelected) {
        onDeviceSelected(deviceId);
      }
    } catch {
      // Errors are already handled inside connectToDevice via context error state.
    }
  };

  const handleDisconnect = async () => {
    try {
      setSelectedDeviceId(null);
      previousDeviceIdRef.current = null;
      // Close modal first to prevent UI blocking
      onClose();
      // Then disconnect in background
      disconnectDevice().catch((error) => {
        // Error already handled in disconnectDevice, just log
        console.error('Disconnect error:', error);
      });
    } catch (error) {
      // Error already handled in disconnectDevice
      console.error('Disconnect error:', error);
      // Still close modal even on error
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan for Bluetooth Devices</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color="#11181C" />
          </Pressable>
        </View>

        {!isAvailable && (
          <View style={styles.warningContainer}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#F39C12" />
            <Text style={styles.warningText}>
              Bluetooth Low Energy is not available in Expo Go. Please use a development build or bare React Native project to use BLE features.
            </Text>
          </View>
        )}

        {isAvailable && error && (
          <View style={[styles.warningContainer, styles.errorContainer]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#E74C3C" />
            <Text style={styles.warningText}>{error}</Text>
          </View>
        )}

        <View style={styles.controls}>
          {!isScanning ? (
            <Pressable
              onPress={handleStartScan}
              style={[styles.scanButton, !isAvailable && styles.scanButtonDisabled]}
              disabled={!isAvailable}
            >
              <IconSymbol name="antenna.radiowaves.left.and.right" size={20} color="#ffffff" />
              <Text style={styles.scanButtonText}>Start Scan</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleStopScan} style={[styles.scanButton, styles.stopButton]}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.scanButtonText}>Scanning...</Text>
            </Pressable>
          )}

          {connectedDevice && (
            <View style={styles.connectedContainer}>
              <View style={styles.connectedInfo}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#27AE60" />
                <Text style={styles.connectedText}>
                  Connected: {connectedDevice.name || connectedDevice.id}
                </Text>
              </View>
              <Pressable onPress={handleDisconnect} style={styles.disconnectButton}>
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </Pressable>
            </View>
          )}
        </View>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.deviceList}
          renderItem={({ item }) => {
            const isConnected = connectedDevice?.id === item.id;
            const isConnectingToThis = isConnecting && selectedDeviceId === item.id;
            const displayName =
              item.name ?? (item.device as any)?.localName ?? (item.device as any)?.name ?? 'Unknown Device';

            return (
              <Pressable
                style={[styles.deviceItem, isConnected && styles.deviceItemConnected]}
                onPress={() => !isConnected && !isConnectingToThis && handleConnect(item.id)}
                disabled={isConnected || isConnectingToThis}
              >
                <View style={styles.deviceInfo}>
                  <IconSymbol
                    name={isConnected ? 'bluetooth' : 'circle'}
                    size={24}
                    color={isConnected ? '#27AE60' : '#687076'}
                  />
                  <View style={styles.deviceDetails}>
                    <Text style={styles.deviceName}>{displayName}</Text>
                    <Text style={styles.deviceId}>{item.id}</Text>
                    {item.rssi !== null && (
                      <Text style={styles.deviceRssi}>RSSI: {item.rssi} dBm</Text>
                    )}
                  </View>
                </View>
                {isConnectingToThis ? (
                  <ActivityIndicator size="small" color="#687076" />
                ) : isConnected ? (
                  <IconSymbol name="checkmark.circle.fill" size={24} color="#27AE60" />
                ) : (
                  <IconSymbol name="chevron.right" size={20} color="#687076" />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            !isScanning ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {devices.length === 0
                    ? 'Press "Start Scan" to search for Bluetooth devices'
                    : 'No devices found'}
                </Text>
              </View>
            ) : null
          }
        />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#11181C',
  },
  closeButton: {
    padding: 8,
  },
  errorContainer: {
    backgroundColor: '#E74C3C',
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonDisabled: {
    backgroundColor: '#7f8c8d',
    opacity: 0.6,
  },
  stopButton: {
    backgroundColor: '#E74C3C',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#F39C12',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 12,
    alignItems: 'center',
  },
  warningText: {
    color: '#11181C',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  connectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedText: {
    color: '#11181C',
    fontSize: 14,
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: '#E74C3C',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceItemConnected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#27AE60',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    color: '#11181C',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    color: '#11181C',
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  deviceRssi: {
    color: '#11181C',
    fontSize: 12,
    opacity: 0.5,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#11181C',
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});

