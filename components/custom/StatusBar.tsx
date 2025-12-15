import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePatients } from '@/hooks/PatientsContext';

interface CustomStatusBarProps {
  readonly variant?: 'patients-list' | 'tabs';
}

export default function CustomStatusBar({ variant }: CustomStatusBarProps = {}) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { selectedPatient, selectedPatientId } = usePatients();
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
  const statusColor = selectedPatient.isConnected ? '#27AE60' : '#7f8c8d';

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
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.statusRow}>
            <View style={styles.statusIndicator}>
              <Animated.View
                style={[
                  styles.greenDot,
                  { backgroundColor: '#27AE60', transform: [{ scale: scaleAnim }] },
                ]}
              />
              <Text style={styles.statusText}>System Connected</Text>
            </View>
            <Text style={styles.timeText}>Last Update: {formatTime(lastUpdateTime)}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Scenario 2: patient detail tabs – show patient info
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

        <View style={styles.topRow}>
          <Pressable style={styles.backButton} onPress={() => router.push('/')}>
            <IconSymbol name="chevron.left" size={20} color="#ffffff" />
          </Pressable>
          <View style={styles.patientInfo}>
            <Image source={{ uri: selectedPatient.avatarUrl }} style={styles.avatar} />
            <View>
              <Text style={styles.patientName}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </Text>
              <Text style={styles.patientMeta}>
                {selectedPatient.uuid} • {selectedPatient.age}y • {selectedPatient.sex}
              </Text>
            </View>
          </View>
        </View>
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
    backgroundColor: '#010D13',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  patientMeta: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.75,
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
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
});
