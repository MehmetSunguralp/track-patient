import AreaChart from '@/components/custom/AreaChart';
import FullscreenMapView from '@/components/custom/FullscreenMapView';
import CustomMapView from '@/components/custom/MapView';
import { ThemedView } from '@/components/themed-view';
import dummyData from '@/data/dummyData.json';
import { useIsFocused } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const locations = dummyData.data.map((item) => ({
  lat: item.gps.lat,
  lon: item.gps.lon,
}));

const chartData = dummyData.data.map((item) => ({
  timestamp: item.timestamp.slice(11, 19), // HH:MM:SS
  lat: item.gps.lat,
  lon: item.gps.lon,
  speed: item.gps.speedKmh,
}));

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [isFullscreenMapVisible, setIsFullscreenMapVisible] = useState(false);

  // Prepare data for latitude chart
  const latData = chartData.map((item) => ({
    value: item.lat,
    label: item.timestamp,
  }));

  // Prepare data for longitude chart
  const lonData = chartData.map((item) => ({
    value: item.lon,
    label: item.timestamp,
  }));

  // Prepare data for speed chart
  const speedData = chartData.map((item) => ({
    value: item.speed,
    label: item.timestamp,
  }));

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CustomMapView
          shouldAnimate={isFocused}
          locations={locations}
          onFullscreenPress={() => setIsFullscreenMapVisible(true)}
        />

        <View style={styles.chartSpacing} />

        {/* Latitude Chart */}
        <AreaChart color="#3498DB" data={latData} title="Latitude" shouldAnimate={isFocused} />

        <View style={styles.chartSpacing} />

        {/* Longitude Chart */}
        <AreaChart color="#E74C3C" data={lonData} title="Longitude" shouldAnimate={isFocused} />

        <View style={styles.chartSpacing} />

        {/* Speed Chart */}
        <AreaChart color="#27AE60" data={speedData} title="Speed" shouldAnimate={isFocused} />
      </ScrollView>

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
  chartSpacing: {
    height: 24,
  },
});
