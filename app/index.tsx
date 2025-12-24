import CustomStatusBar from '@/components/custom/StatusBar';
import BLEDeviceScanner from '@/components/custom/BLEDeviceScanner';
// import BLEDataLogs from '@/components/custom/BLEDataLogs';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppMode } from '@/hooks/AppModeContext';
import { useBLE } from '@/hooks/BLEContext';
import { usePatients } from '@/hooks/PatientsContext';
import { useRouter } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { patients, selectedPatientId, setSelectedPatientId } = usePatients();
  const { isProductionMode, toggleMode } = useAppMode();
  const { connectedDevice } = useBLE();
  const [isScannerVisible, setIsScannerVisible] = useState(false);

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
            <View style={styles.centeredContainer}>
              <Pressable
                style={styles.bleButtonCenter}
                onPress={() => setIsScannerVisible(true)}
              >
                <IconSymbol
                  name="antenna.radiowaves.left.and.right"
                  size={24}
                  color="#ffffff"
                />
                <Text style={styles.bleButtonTextCenter}>Scan for Devices</Text>
              </Pressable>
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
                <Pressable
                  style={styles.scanButtonSmall}
                  onPress={() => setIsScannerVisible(true)}
                >
                  <Text style={styles.scanButtonSmallText}>Change Device</Text>
                </Pressable>
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
                <Pressable
                  style={styles.scanButtonSmall}
                  onPress={() => setIsScannerVisible(true)}
                >
                  <Text style={styles.scanButtonSmallText}>Change Device</Text>
                </Pressable>
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
      <BLEDeviceScanner
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
      />
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
  bleButtonCenter: {
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
  bleButtonTextCenter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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
