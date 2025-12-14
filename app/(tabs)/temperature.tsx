import AreaChart from '@/components/custom/AreaChart';
import { ThemedView } from '@/components/themed-view';
import dummyData from '@/data/dummyData.json';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const chartData = dummyData.data.map((item) => ({
  value: item.temperature.skinC,
  label: item.timestamp.slice(11, 19), // HH:MM:SS
}));

export default function TemperatureScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <AreaChart color="#E74C3C" data={chartData} title="Temperature" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
