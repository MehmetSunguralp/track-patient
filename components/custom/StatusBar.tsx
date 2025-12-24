import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePatients } from '@/hooks/PatientsContext';
import { useAppMode } from '@/hooks/AppModeContext';
import { useBLE } from '@/hooks/BLEContext';

interface CustomStatusBarProps {
  readonly variant?: 'patients-list' | 'tabs';
}

export default function CustomStatusBar({ variant }: CustomStatusBarProps = {}) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { selectedPatient, selectedPatientId } = usePatients();
  const { connectedDevice } = useBLE();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [scaleAnim]);

  const lastUpdateTime = selectedPatient.data?.data.at(-1)?.timestamp ?? '';

  const formatTime = (timestamp: string) => {
    if (!timestamp) {
      return '--:--';
    }

    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const statusLabel = selectedPatient.isConnected ? 'Live' : 'Disconnected';
  const statusColor = selectedPatient.isConnected ? '#27AE60' : '#687076';

  // Determine which variant to show based on prop or pathname
  // If variant prop is provided, use it; otherwise detect from pathname
  let isPatientsScreen: boolean;

  if (variant === 'patients-list') {
    isPatientsScreen = true;
  } else if (variant === 'tabs') {
    isPatientsScreen = false;
  } else {
    // Auto-detect: check if pathname includes '(tabs)' or matches tab routes
    const tabRoutes = ['index', 'heart-rate', 'temperature', 'blood-pressure', 'location'];
    const pathSegments = pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments.at(-1) || '';

    const isInTabs =
      pathname.includes('(tabs)') ||
      pathname.startsWith('/(tabs)') ||
      tabRoutes.includes(lastSegment);

    isPatientsScreen = pathname === '/' && !isInTabs;
  }

  if (isPatientsScreen) {
    // Scenario 1: patients list – generic connection + last update
    const isSystemConnected = !!connectedDevice;
    const systemStatusColor = isSystemConnected ? '#27AE60' : '#687076';
    const systemStatusText = isSystemConnected ? 'System Connected' : 'Disconnected';
    
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.statusRow}>
            <View style={styles.statusIndicator}>
              {isSystemConnected ? (
                <Animated.View
                  style={[
                    styles.greenDot,
                    { backgroundColor: systemStatusColor, transform: [{ scale: scaleAnim }] },
                  ]}
                />
              ) : (
                <View style={[styles.greenDot, { backgroundColor: systemStatusColor }]} />
              )}
              <Text style={styles.statusText}>{systemStatusText}</Text>
            </View>
            <Text style={styles.timeText}>Last Update: {formatTime(lastUpdateTime)}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Scenario 2: patient detail tabs – show patient info
  const { isProductionMode } = useAppMode();
  // Extract patient ID (e.g., "ble-p1" -> "p1")
  const patientId = selectedPatient.id.replace('ble-', '');
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={styles.statusIndicator}>
            {selectedPatient.isConnected ? (
              <Animated.View
                style={[
                  styles.greenDot,
                  { backgroundColor: statusColor, transform: [{ scale: scaleAnim }] },
                ]}
              />
            ) : (
              <View style={[styles.greenDot, { backgroundColor: statusColor }]} />
            )}
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          <Text style={styles.timeText}>Last Update: {formatTime(lastUpdateTime)}</Text>
        </View>

        {isProductionMode ? (
          // Production mode: show only patient ID
          <View style={styles.topRow}>
            <View style={styles.patientInfo}>
              <View style={styles.patientIdBadge}>
                <Text style={styles.patientIdText}>{patientId}</Text>
              </View>
              <View>
                <Text style={styles.patientName}>{patientId}</Text>
                <Text style={styles.patientMeta}>{selectedPatient.uuid}</Text>
              </View>
            </View>
          </View>
        ) : (
          // Test mode: show full patient info
          <View style={styles.topRow}>
            <View style={styles.patientInfo}>
              <Image source={{ uri: selectedPatient.avatarUrl }} style={styles.avatar} />
              <View>
                <Text style={styles.patientName}>
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </Text>
                <Text style={styles.patientMeta}>
                  {selectedPatient.uuid} • {selectedPatient.age}y
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    paddingTop: 4,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  patientName: {
    color: '#11181C',
    fontSize: 14,
    fontWeight: '600',
  },
  patientMeta: {
    color: '#11181C',
    fontSize: 11,
    opacity: 0.75,
  },
  patientIdBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  patientIdText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27AE60',
    marginRight: 6,
  },
  statusText: {
    color: '#11181C',
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    color: '#11181C',
    fontSize: 12,
    opacity: 0.8,
  },
});
