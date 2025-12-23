import AreaChart from '@/components/custom/AreaChart';
import FullscreenMapView from '@/components/custom/FullscreenMapView';
import CustomMapView from '@/components/custom/MapView';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePatients } from '@/hooks/PatientsContext';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { selectedPatient } = usePatients();
  const [isFullscreenMapVisible, setIsFullscreenMapVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingScrollToDetails, setPendingScrollToDetails] = useState(false);
  const [latLayout, setLatLayout] = useState<{ y: number; height: number } | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const samples = selectedPatient.data?.data ?? [];
  
  // Use stable dependencies to prevent infinite re-renders
  const dataLength = samples.length;
  const latestTimestamp = samples.at(-1)?.timestamp || '';
  const latestLat = samples.at(-1)?.gps.lat || 0;
  const latestLon = samples.at(-1)?.gps.lon || 0;
  const latestSpeed = samples.at(-1)?.gps.speedKmh || 0;

  const locations = useMemo(() => 
    samples
      .filter((item) => item.gps.lat !== 0 && item.gps.lon !== 0)
      .map((item) => ({
        lat: item.gps.lat,
        lon: item.gps.lon,
      })),
    [dataLength, latestLat, latestLon, selectedPatient.id]
  );

  const chartData = useMemo(() => 
    samples.slice(-6).map((item) => ({
      timestamp: item.timestamp.slice(11, 19),
      lat: item.gps.lat,
      lon: item.gps.lon,
      speed: item.gps.speedKmh,
    })),
    [dataLength, latestTimestamp, latestLat, latestLon, latestSpeed, selectedPatient.id]
  );

  // Prepare data for latitude chart (keep full precision for coordinates)
  const latData = useMemo(() => 
    chartData.map((item) => ({
      value: item.lat,
      label: item.timestamp,
    })),
    [dataLength, latestTimestamp, latestLat, selectedPatient.id]
  );

  // Prepare data for longitude chart (keep full precision for coordinates)
  const lonData = useMemo(() => 
    chartData.map((item) => ({
      value: item.lon,
      label: item.timestamp,
    })),
    [dataLength, latestTimestamp, latestLon, selectedPatient.id]
  );

  // Prepare data for speed chart (format to 1 decimal place)
  const speedData = useMemo(() => 
    chartData.map((item) => ({
      value: Math.round(item.speed * 10) / 10, // Round to 1 decimal place
      label: item.timestamp,
    })),
    [dataLength, latestTimestamp, latestSpeed, selectedPatient.id]
  );

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

  const hasData = samples.length > 0;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 70 }]}>
      {hasData ? (
        <>
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
                  // Scroll to top when hiding details
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({
                      y: 0,
                      animated: true,
                    });
                  }
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
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No location data available for this patient. Select a connected patient from the status
            bar.
          </Text>
        </View>
      )}
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
    paddingBottom: 120,
  },
  chartSpacing: {
    height: 24,
  },
  detailsButton: {
    alignSelf: 'center',
    marginTop: -4,
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
