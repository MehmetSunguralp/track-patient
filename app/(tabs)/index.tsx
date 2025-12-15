import FullscreenMapView from '@/components/custom/FullscreenMapView';
import CustomMapView from '@/components/custom/MapView';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePatients } from '@/hooks/PatientsContext';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StatusItemProps {
  readonly icon: string;
  readonly label: string;
  readonly value: string | number;
  readonly color: string;
  readonly unit?: string;
}

function StatusItem({ icon, label, value, color, unit }: StatusItemProps) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusCardHeader}>
        <IconSymbol name={icon as any} size={20} color={color} />
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      <View style={styles.statusCardValue}>
        <Text style={[styles.statusValue, { color }]}>
          {value}
          {unit && <Text style={styles.statusUnit}> {unit}</Text>}
        </Text>
      </View>
    </View>
  );
}

export default function OverallStatusScreen() {
  const insets = useSafeAreaInsets();
  const { selectedPatient } = usePatients();
  const [isFullscreenMapVisible, setIsFullscreenMapVisible] = useState(false);

  const latestSample = selectedPatient.data?.data.at(-1);
  const samples = selectedPatient.data?.data ?? [];

  const locations = samples.map((item) => ({
    lat: item.gps.lat,
    lon: item.gps.lon,
  }));

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 72 }]}>
      {latestSample ? (
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
              value={latestSample.heart.bpm}
              color="#CEA023"
              unit="bpm"
            />
            <StatusItem
              icon="waveform.path"
              label="RR Interval"
              value={latestSample.heart.rrMs}
              color="#8E44AD"
              unit="ms"
            />
            <StatusItem
              icon="gauge"
              label="Max BPM"
              value={latestSample.heart.maxBpmSession}
              color="#E74C3C"
              unit="bpm"
            />
            <StatusItem
              icon="thermometer"
              label="Skin Temperature"
              value={latestSample.temperature.skinC}
              color="#E74C3C"
              unit="°C"
            />
            <StatusItem
              icon="gauge"
              label="Speed"
              value={latestSample.gps.speedKmh}
              color="#27AE60"
              unit="km/h"
            />
            <StatusItem
              icon="location.fill"
              label="Distance"
              value={latestSample.gps.distanceTotalM}
              color="#3498DB"
              unit="m"
            />
            <StatusItem
              icon="bolt.fill"
              label="Metabolic Power"
              value={latestSample.movement.metabolicPowerWkg}
              color="#F39C12"
              unit="W/kg"
            />
            <StatusItem
              icon="gauge"
              label="Activity Zone"
              value={latestSample.movement.activityZone}
              color="#9B59B6"
            />
            <StatusItem
              icon="arrow.left.and.right"
              label="Step Side"
              value={latestSample.movement.stepBalanceSide}
              color="#16A085"
            />
            <StatusItem
              icon="percent"
              label="Step Balance"
              value={latestSample.movement.stepBalancePercent}
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
