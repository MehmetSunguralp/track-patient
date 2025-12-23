import FullscreenMapView from '@/components/custom/FullscreenMapView';
import CustomMapView from '@/components/custom/MapView';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePatients } from '@/hooks/PatientsContext';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StatusItemProps {
  readonly icon: string;
  readonly label: string;
  readonly value: string | number | null | undefined;
  readonly color: string;
  readonly unit?: string;
  readonly previousValue?: string | number | null | undefined;
}

function StatusItem({ icon, label, value, color, unit, previousValue }: StatusItemProps) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevValueRef = useRef(value);
  
  // Flash effect when value changes
  useEffect(() => {
    if (value !== null && value !== undefined && value !== prevValueRef.current && prevValueRef.current !== null && prevValueRef.current !== undefined) {
      // Value changed - trigger flash
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevValueRef.current = value;
  }, [value, flashAnim]);
  
  // Determine display value: use value if available, otherwise previous value, otherwise "-"
  const displayValue = value !== null && value !== undefined && value !== 0 
    ? value 
    : (previousValue !== null && previousValue !== undefined && previousValue !== 0 
      ? previousValue 
      : '-');
  
  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', color + '20'], // 20 = ~12% opacity
  });
  
  return (
    <Animated.View style={[styles.statusCard, { backgroundColor }]}>
      <View style={styles.statusCardHeader}>
        <IconSymbol name={icon as any} size={20} color={color} />
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      <View style={styles.statusCardValue}>
        <Text style={[styles.statusValue, { color: displayValue === '-' ? '#999' : color }]}>
          {displayValue}
          {unit && displayValue !== '-' && <Text style={styles.statusUnit}> {unit}</Text>}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function OverallStatusScreen() {
  const insets = useSafeAreaInsets();
  const { selectedPatient } = usePatients();
  const [isFullscreenMapVisible, setIsFullscreenMapVisible] = useState(false);

  const samples = selectedPatient.data?.data ?? [];
  
  // Memoize derived values to prevent unnecessary re-renders
  const latestSample = useMemo(() => samples.at(-1), [samples]);
  const previousSample = useMemo(() => samples.at(-2), [samples]);
  const dataLength = samples.length;

  // Debug: log selected patient data (only log when patient or data changes)
  useEffect(() => {
    if (selectedPatient.id) {
      console.log(`[OverallStatus] Patient: ${selectedPatient.id}, hasData: ${!!selectedPatient.data}, dataPoints: ${dataLength}, latestSample: ${!!latestSample}`);
    }
  }, [selectedPatient.id, dataLength, latestSample?.timestamp]);

  const locations = useMemo(() => 
    samples
      .filter((item) => item.gps.lat !== 0 && item.gps.lon !== 0)
      .map((item) => ({
        lat: item.gps.lat,
        lon: item.gps.lon,
      })),
    [samples]
  );

  // Show data if we have at least one sample
  const hasData = latestSample && samples.length > 0;
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 70 }]}>
      {hasData ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CustomMapView
            key={`map-${selectedPatient.id}`}
            shouldAnimate={false}
            locations={locations}
            onFullscreenPress={() => setIsFullscreenMapVisible(true)}
          />

          <View style={styles.statusGrid}>
            <StatusItem
              icon="heart.fill"
              label="Heart Rate"
              value={latestSample.heart.bpm || null}
              previousValue={previousSample?.heart.bpm}
              color="#CEA023"
              unit="bpm"
            />
            <StatusItem
              icon="waveform.path"
              label="RR Interval"
              value={latestSample.heart.rrMs || null}
              previousValue={previousSample?.heart.rrMs}
              color="#8E44AD"
              unit="ms"
            />
            <StatusItem
              icon="gauge"
              label="Max BPM"
              value={latestSample.heart.maxBpmSession || null}
              previousValue={previousSample?.heart.maxBpmSession}
              color="#E74C3C"
              unit="bpm"
            />
            <StatusItem
              icon="thermometer"
              label="Skin Temperature"
              value={latestSample.temperature.skinC || null}
              previousValue={previousSample?.temperature.skinC}
              color="#E74C3C"
              unit="°C"
            />
            <StatusItem
              icon="gauge"
              label="Speed"
              value={latestSample.gps.speedKmh || null}
              previousValue={previousSample?.gps.speedKmh}
              color="#27AE60"
              unit="km/h"
            />
            <StatusItem
              icon="location.fill"
              label="Distance"
              value={latestSample.gps.distanceTotalM || null}
              previousValue={previousSample?.gps.distanceTotalM}
              color="#3498DB"
              unit="m"
            />
            <StatusItem
              icon="bolt.fill"
              label="Metabolic Power"
              value={latestSample.movement.metabolicPowerWkg || null}
              previousValue={previousSample?.movement.metabolicPowerWkg}
              color="#F39C12"
              unit="W/kg"
            />
            <StatusItem
              icon="gauge"
              label="Activity Zone"
              value={latestSample.movement.activityZone || null}
              previousValue={previousSample?.movement.activityZone}
              color="#9B59B6"
            />
            <StatusItem
              icon="arrow.left.and.right"
              label="Step Side"
              value={latestSample.movement.stepBalanceSide || null}
              previousValue={previousSample?.movement.stepBalanceSide}
              color="#16A085"
            />
            <StatusItem
              icon="percent"
              label="Step Balance"
              value={latestSample.movement.stepBalancePercent || null}
              previousValue={previousSample?.movement.stepBalancePercent}
              color="#1ABC9C"
              unit="%"
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No live data available for this patient. Select a connected patient to see current
            status.
          </Text>
        </View>
      )}

      <FullscreenMapView
        visible={isFullscreenMapVisible}
        onClose={() => setIsFullscreenMapVisible(false)}
        locations={locations}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  statusCard: {
    width: '48%',
    backgroundColor: '#010D13',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    opacity: 0.8,
  },
  statusCardValue: {
    marginTop: 4,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusUnit: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
});
