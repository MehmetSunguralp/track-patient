import AreaChart from '@/components/custom/AreaChart';
import { ThemedView } from '@/components/themed-view';
import dummyData from '@/data/dummyData.json';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const chartData = dummyData.data.map((item) => ({
  value: item.heart.bpm,
  label: item.timestamp.slice(11, 19), // HH:MM:SS
}));
const chartData2 = dummyData.data.map((item) => ({
  value: item.temperature.skinC,
  label: item.timestamp.slice(11, 19), // HH:MM:SS
}));
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <AreaChart color="#CEA023" data={chartData} title="Heart Rate" />
      <AreaChart color="#94531E" data={chartData2} title="Temperature" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    margin: 16,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
