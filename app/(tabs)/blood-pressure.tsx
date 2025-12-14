import AreaChart from '@/components/custom/AreaChart';
import { ThemedView } from '@/components/themed-view';
import dummyData from '@/data/dummyData.json';
import { useIsFocused } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Generate synthetic blood pressure data (mean arterial pressure)
// Using a formula: MAP ≈ (2 * diastolic + systolic) / 3
// Creating values that correlate with heart rate for realism
const chartData = dummyData.data.map((item) => {
  // Generate realistic blood pressure values based on heart rate
  // Higher heart rate typically correlates with higher BP
  const baseSystolic = 110;
  const baseDiastolic = 70;
  const heartRateFactor = (item.heart.bpm - 70) * 0.3; // Adjust based on heart rate
  const systolic = baseSystolic + heartRateFactor;
  const diastolic = baseDiastolic + heartRateFactor * 0.6;
  // Calculate mean arterial pressure
  const map = (2 * diastolic + systolic) / 3;
  return {
    value: Math.round(map),
    label: item.timestamp.slice(11, 19), // HH:MM:SS
  };
});

export default function BloodPressureScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <AreaChart
        color="#8E44AD"
        data={chartData}
        title="Blood Pressure"
        shouldAnimate={isFocused}
        iconName="waveform.path"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
