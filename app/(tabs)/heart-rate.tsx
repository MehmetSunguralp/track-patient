import AreaChart from '@/components/custom/AreaChart';
import { ThemedView } from '@/components/themed-view';
import dummyData from '@/data/dummyData.json';
import { useIsFocused } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const chartData = dummyData.data.map((item) => ({
  value: item.heart.bpm,
  label: item.timestamp.slice(11, 19), // HH:MM:SS
}));

export default function HeartRateScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <AreaChart
        color="#CEA023"
        data={chartData}
        title="Heart Rate"
        shouldAnimate={isFocused}
        iconName="heart.fill"
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
