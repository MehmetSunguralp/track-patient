import AreaChart from '@/components/custom/AreaChart';
import { ThemedView } from '@/components/themed-view';
import { usePatients } from '@/hooks/PatientsContext';
import { useIsFocused } from '@react-navigation/native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HeartRateScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { selectedPatient } = usePatients();

  const samples = selectedPatient.data?.data ?? [];
  const dataLength = samples.length;
  const latestTimestamp = samples.at(-1)?.timestamp || '';
  const latestBpm = samples.at(-1)?.heart.bpm || 0;
  
  const chartData = useMemo(() => 
    samples.slice(-6).map((item) => ({
      value: item.heart.bpm,
      label: item.timestamp.slice(11, 19),
    })),
    [dataLength, latestTimestamp, latestBpm, selectedPatient.id]
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 110 }]}>
      {chartData.length > 0 ? (
        <AreaChart
          color="#CEA023"
          data={chartData}
          title="Heart Rate"
          shouldAnimate={isFocused}
          iconName="heart.fill"
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No heart-rate data available for this patient. Select a connected patient from the
            status bar.
          </Text>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
    opacity: 0.8,
  },
});
