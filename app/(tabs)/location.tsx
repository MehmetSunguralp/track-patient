import AreaChart from '@/components/custom/AreaChart';
import FullscreenMapView from '@/components/custom/FullscreenMapView';
import CustomMapView from '@/components/custom/MapView';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import dummyData from '@/data/dummyData.json';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [showDetails, setShowDetails] = useState(false);
  const [pendingScrollToDetails, setPendingScrollToDetails] = useState(false);
  const [latLayout, setLatLayout] = useState<{ y: number; height: number } | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

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

  useEffect(() => {
    if (showDetails && pendingScrollToDetails && latLayout && scrollViewRef.current) {
      const screenHeight = Dimensions.get('window').height;
      const targetY = Math.max(0, latLayout.y + latLayout.height / 2 - screenHeight / 2);

      scrollViewRef.current.scrollTo({
        y: targetY,
        animated: true,
      });

      setPendingScrollToDetails(false);
    }
  }, [showDetails, pendingScrollToDetails, latLayout]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={showDetails}
        showsVerticalScrollIndicator={false}
      >
        <CustomMapView
          shouldAnimate={isFocused}
          locations={locations}
          onFullscreenPress={() => setIsFullscreenMapVisible(true)}
        />

        <View style={styles.chartSpacing} />

        {/* Speed Chart */}
        <AreaChart
          color="#27AE60"
          data={speedData}
          title="Speed"
          shouldAnimate={isFocused}
          iconName="gauge"
        />

        <View style={styles.chartSpacing} />

        <Pressable
          style={styles.detailsButton}
          onPress={() => {
            if (showDetails) {
              setShowDetails(false);
              setPendingScrollToDetails(false);
              return;
            }

            setShowDetails(true);
            setPendingScrollToDetails(true);
          }}
        >
          <View style={styles.detailsButtonContent}>
            <IconSymbol
              name="chevron.right"
              size={20}
              color="#ffffff"
              style={styles.detailsButtonIcon}
            />
            <Text style={styles.detailsButtonText}>
              {showDetails ? 'Hide details' : 'More details'}
            </Text>
          </View>
        </Pressable>

        {showDetails && (
          <>
            <View style={styles.chartSpacing} />

            {/* Latitude Chart */}
            <View
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                setLatLayout({ y, height });
              }}
            >
              <AreaChart
                color="#3498DB"
                data={latData}
                title="Latitude"
                shouldAnimate={isFocused}
                iconName="location.north"
              />
            </View>

            <View style={styles.chartSpacing} />

            {/* Longitude Chart */}
            <AreaChart
              color="#E74C3C"
              data={lonData}
              title="Longitude"
              shouldAnimate={isFocused}
              iconName="arrow.left.and.right"
            />
          </>
        )}
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
  detailsButton: {
    alignSelf: 'center',
    marginTop: 4,
  },
  detailsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailsButtonIcon: {
    marginRight: 8,
  },
  detailsButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '500',
  },
});
