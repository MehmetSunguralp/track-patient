import AreaChart from '@/components/custom/AreaChart';
import { ThemedView } from '@/components/themed-view';
import { usePatients } from '@/hooks/PatientsContext';
import { useIsFocused } from '@react-navigation/native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RRIntervalScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { selectedPatient } = usePatients();

  const samples = selectedPatient.data?.data ?? [];
  const dataLength = samples.length;
  const latestTimestamp = samples.at(-1)?.timestamp || '';
  const latestRR = samples.at(-1)?.heart.rrMs || 0;
  
  const chartData = useMemo(() => 
    samples.slice(-6).map((item) => ({
      value: item.heart.rrMs,
      label: item.timestamp.slice(11, 19),
    })),
    [dataLength, latestTimestamp, latestRR, selectedPatient.id]
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 110 }]}>
      {chartData.length > 0 ? (
        <AreaChart
          color="#8E44AD"
          data={chartData}
          title="RR Interval"
          shouldAnimate={isFocused}
          iconName="waveform.path"
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No RR interval data available for this patient. Select a connected patient from the
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

