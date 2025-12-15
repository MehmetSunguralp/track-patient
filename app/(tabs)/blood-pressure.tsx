import AreaChart from '@/components/custom/AreaChart';
import { ThemedView } from '@/components/themed-view';
import { usePatients } from '@/hooks/PatientsContext';
import { useIsFocused } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BloodPressureScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { selectedPatient } = usePatients();

  const samples = selectedPatient.data?.data ?? [];

  const chartData = samples.map((item) => {
    const baseSystolic = 110;
    const baseDiastolic = 70;
    const heartRateFactor = (item.heart.bpm - 70) * 0.3;
    const systolic = baseSystolic + heartRateFactor;
    const diastolic = baseDiastolic + heartRateFactor * 0.6;
    const map = (2 * diastolic + systolic) / 3;
    return {
      value: Math.round(map),
      label: item.timestamp.slice(11, 19),
    };
  });

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 110 }]}>
      {chartData.length > 0 ? (
        <AreaChart
          color="#8E44AD"
          data={chartData}
          title="Blood Pressure"
          shouldAnimate={isFocused}
          iconName="waveform.path"
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No blood-pressure data available for this patient. Select a connected patient from the
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
