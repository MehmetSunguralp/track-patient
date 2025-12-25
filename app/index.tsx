import CustomStatusBar from '@/components/custom/StatusBar';
// import BLEDataLogs from '@/components/custom/BLEDataLogs';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppMode } from '@/hooks/AppModeContext';
import { useBLE } from '@/hooks/BLEContext';
import { usePatients } from '@/hooks/PatientsContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path, Rect } from 'react-native-svg';

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const watchIconSize = screenWidth * 0.75;
  const { patients, selectedPatientId, setSelectedPatientId } = usePatients();
  const { isProductionMode, toggleMode } = useAppMode();
  const {
    connectedDevice,
    devices,
    isScanning,
    isConnecting,
    startScan,
    stopScan,
    connectToDevice,
    isAvailable,
  } = useBLE();
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  // Infinite slow shaking animation for watch icon
  useEffect(() => {
    const shakeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    shakeAnimation.start();
    return () => shakeAnimation.stop();
  }, [shakeAnim]);

  // Helper function to get signal level color and bars
  const getSignalColor = (rssi: number | null): string => {
    if (rssi === null) return '#687076';
    if (rssi >= -65) return '#27AE60'; // Green: Excellent signal
    if (rssi >= -75) return '#F39C12'; // Yellow: Good signal
    return '#E74C3C'; // Red: Weak signal
  };

  const getSignalBars = (rssi: number | null): number => {
    if (rssi === null) return 0;
    if (rssi >= -65) return 3; // Excellent: 3 bars
    if (rssi >= -75) return 2; // Good: 2 bars
    return 1; // Weak: 1 bar
  };

  // Signal Icon Component
  const SignalIcon = ({ rssi }: { rssi: number | null }) => {
    const bars = getSignalBars(rssi);
    const color = getSignalColor(rssi);

    return (
      <View style={styles.signalIconContainer}>
        <View style={styles.signalBars}>
          <View
            style={[styles.signalBar, styles.signalBar1, bars >= 1 && { backgroundColor: color }]}
          />
          <View
            style={[styles.signalBar, styles.signalBar2, bars >= 2 && { backgroundColor: color }]}
          />
          <View
            style={[styles.signalBar, styles.signalBar3, bars >= 3 && { backgroundColor: color }]}
          />
        </View>
        {rssi !== null && <Text style={styles.signalRssiText}>{rssi} dBm</Text>}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#F0F8FF', '#FFFFFF']}
      style={[styles.container, { paddingTop: insets.top + 40 }]}
    >
      <CustomStatusBar variant="patients-list" />
      {patients.length > 0 && (
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <IconSymbol name="cross.case" size={28} color="#11181C" />
            <Text style={styles.heading}>Patients</Text>
          </View>
        </View>
      )}
      {isProductionMode ? (
        <View style={styles.productionContainer}>
          {!connectedDevice ? (
            <View style={styles.deviceListContainer}>
              {isScanning && (
                <View style={styles.scanHeader}>
                  <Text style={styles.scanHeaderText}>Available Devices</Text>
                  <View style={styles.scanningIndicator}>
                    <ActivityIndicator size="small" color="#3498DB" />
                    <Text style={styles.scanningText}>Scanning...</Text>
                    <Pressable onPress={stopScan} style={styles.stopButton}>
                      <Text style={styles.stopButtonText}>Stop</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              {!isAvailable && (
                <View style={styles.warningContainer}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#F39C12" />
                  <Text style={styles.warningText}>
                    Bluetooth Low Energy is not available. Please use a development build.
                  </Text>
                </View>
              )}
              {isAvailable && devices.length === 0 && !isScanning && (
                <View style={styles.centeredContainer}>
                  <Text style={styles.trackPatientsTitle}>Track Patients</Text>
                  <Animated.View
                    style={[
                      styles.watchIconContainer,
                      {
                        transform: [
                          {
                            rotate: shakeAnim.interpolate({
                              inputRange: [-1, 0, 1],
                              outputRange: ['-3deg', '0deg', '3deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Svg width={watchIconSize} height={watchIconSize} viewBox="0 0 24 24">
                      <G>
                        <Path
                          d="M17,3V5a1,1,0,0,1-1,1H8A1,1,0,0,1,7,5V3A1,1,0,0,1,8,2h8A1,1,0,0,1,17,3ZM16,18H8a1,1,0,0,0-1,1v2a1,1,0,0,0,1,1h8a1,1,0,0,0,1-1V19A1,1,0,0,0,16,18Z"
                          fill="#3498DB"
                        />
                        <Rect x="5" y="4" width="14" height="16" rx="2" fill="#000000" />
                        <Path
                          d="M12,14.34a1,1,0,0,1-.71-.3L10,12.77a1.83,1.83,0,0,1,0-2.55l0,0a1.79,1.79,0,0,1,1.28-.53,1.59,1.59,0,0,1,.7.14,1.84,1.84,0,0,1,2,.41h0a1.84,1.84,0,0,1,0,2.57L12.72,14A1,1,0,0,1,12,14.34Zm-.82-2.73Z"
                          fill="#3498DB"
                        />
                      </G>
                    </Svg>
                  </Animated.View>
                  <Pressable style={styles.scanButton} onPress={() => startScan()}>
                    <IconSymbol
                      name="antenna.radiowaves.left.and.right"
                      size={24}
                      color="#ffffff"
                    />
                    <Text style={styles.scanButtonText}>Scan for Devices</Text>
                  </Pressable>
                </View>
              )}
              {isAvailable && devices.length === 0 && isScanning && (
                <View style={styles.centeredContainer}>
                  <View style={styles.scanningContainer}>
                    <ActivityIndicator size="large" color="#3498DB" />
                    <Text style={styles.scanningText}>Scanning for devices...</Text>
                  </View>
                </View>
              )}
              {isAvailable && devices.length > 0 && (
                <View>
                  {!isScanning && (
                    <View style={styles.scanButtonContainer}>
                      <Pressable style={styles.scanButton} onPress={() => startScan()}>
                        <IconSymbol
                          name="antenna.radiowaves.left.and.right"
                          size={24}
                          color="#ffffff"
                        />
                        <Text style={styles.scanButtonText}>Scan for Devices</Text>
                      </Pressable>
                    </View>
                  )}
                  <FlatList
                    data={devices}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.deviceList}
                    renderItem={({ item }) => {
                      const isConnectingToThis =
                        connectingDeviceId === item.id ||
                        (isConnecting && connectedDevice?.id === item.id);
                      const displayName =
                        item.name ??
                        (item.device as any)?.localName ??
                        (item.device as any)?.name ??
                        'Unknown Device';
                      const signalColor = getSignalColor(item.rssi);

                      return (
                        <Pressable
                          style={[
                            styles.deviceItem,
                            isConnectingToThis && styles.deviceItemConnecting,
                          ]}
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
                            <SignalIcon rssi={item.rssi} />
                            <View style={styles.deviceDetails}>
                              <Text style={styles.deviceName}>{displayName}</Text>
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
                </View>
              )}
            </View>
          ) : patients.length > 0 ? (
            <View style={styles.productionContent}>
              {/* <BLEDataLogs /> */}
              <FlatList
                data={patients}
                numColumns={4}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.avatarGrid}
                renderItem={({ item, index }) => {
                  const isSelected = item.id === selectedPatientId;
                  // Extract patient ID (e.g., "ble-p1" -> "p1")
                  const patientId = item.id.replace('ble-', '');
                  // Format patient number as 01, 02, 03...
                  const patientNumber = String(index + 1).padStart(2, '0');

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
                        <IconSymbol
                          name="applewatch"
                          size={32}
                          color={item.isConnected ? '#3498DB' : '#687076'}
                        />
                        <View style={styles.patientNumberBadge}>
                          <Text style={styles.patientNumberText}>{patientNumber}</Text>
                        </View>
                      </View>
                      {/* <Text style={styles.avatarName} numberOfLines={1}>
                        {patientNumber}
                      </Text> */}
                    </Pressable>
                  );
                }}
              />
            </View>
          ) : (
            <View style={styles.productionContent}>
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
          renderItem={({ item, index }) => {
            const isSelected = item.id === selectedPatientId;
            // Format patient number as 01, 02, 03...
            const patientNumber = String(index + 1).padStart(2, '0');

            return (
              <Pressable
                style={styles.avatarItem}
                onPress={() => {
                  setSelectedPatientId(item.id);
                  router.push('/(tabs)');
                }}
              >
                <View style={styles.avatarContainer}>
                  <View
                    style={[
                      styles.avatarWrapper,
                      item.isConnected && styles.avatarConnected,
                      isSelected && styles.avatarSelected,
                    ]}
                  >
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                  </View>
                  <View style={styles.patientNumberBadge}>
                    <Text style={styles.patientNumberText}>{patientNumber}</Text>
                  </View>
                </View>
                <Text style={styles.avatarName} numberOfLines={1}>
                  {item.firstName}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
      <View style={[styles.toggleContainer, { paddingBottom: Math.max(insets.bottom + 12, 32) }]}>
        <View style={styles.modeToggleContainer}>
          <Text style={styles.modeLabel}>Test</Text>
          <Switch
            value={isProductionMode}
            onValueChange={toggleMode}
            trackColor={{ false: '#e0e0e0', true: '#27AE60' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#e0e0e0"
            style={styles.toggleSwitch}
          />
          <Text style={styles.modeLabel}>Live</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#11181C',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  toggleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 245, 245, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(224, 224, 224, 0.6)',
    opacity: 0.7,
  },
  toggleSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  modeLabel: {
    color: '#11181C',
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
  },
  productionContainer: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  scanButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  trackPatientsTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  watchIconContainer: {
    marginBottom: 16,
  },
  productionContent: {
    flex: 1,
    paddingTop: 16,
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
  scanHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3498DB',
    borderRadius: 6,
  },
  scanHeaderButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  stopButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#E74C3C',
    borderRadius: 6,
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
  signalIconContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
    marginBottom: 4,
  },
  signalBar: {
    width: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    minWidth: 4,
  },
  signalBar1: {
    height: 4,
  },
  signalBar2: {
    height: 8,
  },
  signalBar3: {
    height: 12,
  },
  signalRssiText: {
    fontSize: 10,
    color: '#11181C',
    opacity: 0.7,
    textAlign: 'center',
  },
  deviceDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    color: '#11181C',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceId: {
    color: '#11181C',
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  deviceRssi: {
    fontSize: 12,
    fontWeight: '500',
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
  avatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  avatarConnected: {
    borderColor: '#3498DB',
  },
  avatarSelected: {
    borderWidth: 3,
    shadowColor: '#3498DB',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  patientNumberBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#3498DB',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 10,
    elevation: 10,
  },
  patientNumberText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
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
