import CustomStatusBar from '@/components/custom/StatusBar';
import BLEDeviceScanner from '@/components/custom/BLEDeviceScanner';
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
              trackColor={{ false: '#2c3e50', true: '#27AE60' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#2c3e50"
            />
            <Text style={styles.modeLabel}>Prod</Text>
          </View>
        </View>
      </View>
      {isProductionMode ? (
        <View style={styles.productionContainer}>
          <Pressable
            style={[
              styles.bleButtonCenter,
              connectedDevice && styles.bleButtonConnected,
            ]}
            onPress={() => setIsScannerVisible(true)}
          >
            <IconSymbol
              name={connectedDevice ? 'checkmark.circle.fill' : 'antenna.radiowaves.left.and.right'}
              size={24}
              color="#ffffff"
            />
            <Text style={styles.bleButtonTextCenter}>
              {connectedDevice ? 'Connected' : 'Scan for Devices'}
            </Text>
          </Pressable>
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
    color: '#ffffff',
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
    backgroundColor: '#1c2833',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2c3e50',
  },
  modeLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  productionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  bleButtonConnected: {
    backgroundColor: '#27AE60',
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
    borderColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c2833',
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
  avatarName: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
});
