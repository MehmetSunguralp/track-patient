import CustomStatusBar from '@/components/custom/StatusBar';
// import BLEDataLogs from '@/components/custom/BLEDataLogs';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppMode } from '@/hooks/AppModeContext';
import { useBLE } from '@/hooks/BLEContext';
import { usePatients } from '@/hooks/PatientsContext';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { patients, selectedPatientId, setSelectedPatientId } = usePatients();
  const { isProductionMode, toggleMode } = useAppMode();
  const { connectedDevice, devices, isScanning, isConnecting, startScan, stopScan, connectToDevice, isAvailable } = useBLE();
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

  // Stop scanning when connected and reset connecting state
  useEffect(() => {
    if (connectedDevice && isScanning) {
      stopScan();
      setConnectingDeviceId(null);
    }
    // Reset connecting state when not connecting
    if (!isConnecting) {
      setConnectingDeviceId(null);
    }
  }, [connectedDevice, isScanning, isConnecting, stopScan]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 72 }]}>
      <CustomStatusBar variant="patients-list" />
      <View style={styles.header}>
        <Text style={styles.heading}>Patients</Text>
        <View style={styles.headerControls}>
          <View style={styles.modeToggleContainer}>
            <Text style={styles.modeLabel}>Test</Text>
            <Switch
              value={isProductionMode}
              onValueChange={toggleMode}
              trackColor={{ false: '#e0e0e0', true: '#27AE60' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#e0e0e0"
            />
            <Text style={styles.modeLabel}>Prod</Text>
          </View>
        </View>
      </View>
      {isProductionMode ? (
        <View style={styles.productionContainer}>
          {!connectedDevice ? (
            <View style={styles.deviceListContainer}>
              <View style={styles.scanHeader}>
                <Text style={styles.scanHeaderText}>Available Devices</Text>
                {isScanning && (
                  <View style={styles.scanningIndicator}>
                    <ActivityIndicator size="small" color="#3498DB" />
                    <Text style={styles.scanningText}>Scanning...</Text>
                  </View>
                )}
              </View>
              {!isAvailable && (
                <View style={styles.warningContainer}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#F39C12" />
                  <Text style={styles.warningText}>
                    Bluetooth Low Energy is not available. Please use a development build.
                  </Text>
                </View>
              )}
              {isAvailable && devices.length === 0 && (
                <View style={styles.centeredContainer}>
                  {!isScanning ? (
                    <Pressable style={styles.scanButton} onPress={() => startScan()}>
                      <IconSymbol name="antenna.radiowaves.left.and.right" size={24} color="#ffffff" />
                      <Text style={styles.scanButtonText}>Scan for Devices</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.scanningContainer}>
                      <ActivityIndicator size="large" color="#3498DB" />
                      <Text style={styles.scanningText}>Scanning for devices...</Text>
                    </View>
                  )}
                </View>
              )}
              {isAvailable && devices.length > 0 && (
                <FlatList
                  data={devices}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.deviceList}
                  renderItem={({ item }) => {
                    const isConnectingToThis = connectingDeviceId === item.id || (isConnecting && connectedDevice?.id === item.id);
                    const displayName = item.name ?? (item.device as any)?.localName ?? (item.device as any)?.name ?? 'Unknown Device';

                    return (
                      <Pressable
                        style={[styles.deviceItem, isConnectingToThis && styles.deviceItemConnecting]}
                        onPress={() => {
                          if (!isConnectingToThis && !isConnecting) {
                            setConnectingDeviceId(item.id);
                            connectToDevice(item.id).catch(() => {
                              setConnectingDeviceId(null);
                            });
                          }
                        }}
                        disabled={isConnectingToThis || isConnecting}
                      >
                        <View style={styles.deviceInfo}>
                          <IconSymbol
                            name={isConnectingToThis ? 'bluetooth' : 'circle'}
                            size={24}
                            color={isConnectingToThis ? '#3498DB' : '#687076'}
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
                          <ActivityIndicator size="small" color="#3498DB" />
                        ) : (
                          <IconSymbol name="chevron.right" size={20} color="#687076" />
                        )}
                      </Pressable>
                    );
                  }}
                />
              )}
            </View>
          ) : patients.length > 0 ? (
            <View style={styles.productionContent}>
              <View style={styles.connectedHeader}>
                <View style={styles.connectedStatus}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color="#27AE60" />
                  <Text style={styles.connectedText}>
                    Connected: {connectedDevice.name || connectedDevice.id}
                  </Text>
                </View>
              </View>
              {/* <BLEDataLogs /> */}
              <FlatList
                data={patients}
                numColumns={4}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.avatarGrid}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedPatientId;
                  // Extract patient ID (e.g., "ble-p1" -> "p1")
                  const patientId = item.id.replace('ble-', '');

                  return (
                    <Pressable
                      style={styles.avatarItem}
                      onPress={() => {
                        setSelectedPatientId(item.id);
                        router.push('/(tabs)');
                      }}
                    >
                      <View
                        style={[
                          styles.avatarWrapper,
                          item.isConnected && styles.avatarConnected,
                          isSelected && styles.avatarSelected,
                        ]}
                      >
                        <Text style={styles.patientIdText}>{patientId}</Text>
                      </View>
                      <Text style={styles.avatarName} numberOfLines={1}>
                        {patientId}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          ) : (
            <View style={styles.productionContent}>
              <View style={styles.connectedHeader}>
                <View style={styles.connectedStatus}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color="#27AE60" />
                  <Text style={styles.connectedText}>
                    Connected: {connectedDevice.name || connectedDevice.id}
                  </Text>
                </View>
              </View>
              {/* <BLEDataLogs /> */}
              <View style={styles.waitingContainer}>
                <Text style={styles.waitingText}>Waiting for patient data...</Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={patients}
          numColumns={4}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.avatarGrid}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedPatientId;

            return (
              <Pressable
                style={styles.avatarItem}
                onPress={() => {
                  setSelectedPatientId(item.id);
                  router.push('/(tabs)');
                }}
              >
                <View
                  style={[
                    styles.avatarWrapper,
                    item.isConnected && styles.avatarConnected,
                    isSelected && styles.avatarSelected,
                  ]}
                >
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                </View>
                <Text style={styles.avatarName} numberOfLines={1}>
                  {item.firstName}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#11181C',
    flex: 1,
  },
  headerControls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modeLabel: {
    color: '#11181C',
    fontSize: 12,
    fontWeight: '600',
  },
  productionContainer: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  productionContent: {
    flex: 1,
    paddingTop: 16,
  },
  connectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  connectedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  connectedText: {
    color: '#11181C',
    fontSize: 14,
    fontWeight: '500',
  },
  scanButtonSmall: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scanButtonSmallText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  deviceListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  warningText: {
    color: '#11181C',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#3498DB',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    minWidth: 200,
  },
  scanningContainer: {
    alignItems: 'center',
    gap: 16,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  deviceList: {
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
  deviceItemConnecting: {
    borderColor: '#3498DB',
    borderWidth: 2,
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
  avatarGrid: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  avatarItem: {
    flex: 1 / 4,
    alignItems: 'center',
    marginVertical: 8,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  avatarConnected: {
    borderColor: '#27AE60',
  },
  avatarSelected: {
    borderWidth: 3,
    shadowColor: '#27AE60',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  patientIdText: {
    color: '#11181C',
    fontSize: 18,
    fontWeight: '700',
  },
  avatarName: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#11181C',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  waitingText: {
    fontSize: 16,
    color: '#687076',
    textAlign: 'center',
  },
});
