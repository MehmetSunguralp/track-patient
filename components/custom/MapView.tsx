import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

interface MapViewProps {
  readonly shouldAnimate?: boolean;
  readonly locations: { lat: number; lon: number }[];
  readonly onFullscreenPress?: () => void;
}

export default function CustomMapView({
  shouldAnimate = true,
  locations,
  onFullscreenPress,
}: MapViewProps) {
  const prevFocusedRef = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);
  const mapRef = useRef<MapView>(null);

  // Calculate region to fit all locations
  const calculateRegion = () => {
    if (locations.length === 0) {
      return {
        latitude: 41.015137,
        longitude: 28.97953,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const lats = locations.map((loc) => loc.lat);
    const lons = locations.map((loc) => loc.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    const latitudeDelta = Math.max((maxLat - minLat) * 1.5, 0.01);
    const longitudeDelta = Math.max((maxLon - minLon) * 1.5, 0.01);

    return {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta,
      longitudeDelta,
    };
  };

  useEffect(() => {
    // Set initial opacity to 1 on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only trigger animation when tab becomes focused (transitions from false to true)
    if (shouldAnimate && !prevFocusedRef.current) {
      // Reset opacity to 0
      opacity.setValue(0);

      // Reset map to default view
      if (mapRef.current && locations.length > 0) {
        const coordinates = locations.map((loc) => ({
          latitude: loc.lat,
          longitude: loc.lon,
        }));
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }

      // Fade in the map smoothly
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
    prevFocusedRef.current = shouldAnimate;
  }, [shouldAnimate, opacity, locations]);

  useEffect(() => {
    // Fit map to show all locations on initial load
    if (locations.length > 0 && mapRef.current) {
      const coordinates = locations.map((loc) => ({
        latitude: loc.lat,
        longitude: loc.lon,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: false,
      });
    }
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={calculateRegion()}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {/* Line connecting all locations */}
        {locations.length > 0 && (
          <Polyline
            coordinates={locations.map((loc) => ({
              latitude: loc.lat,
              longitude: loc.lon,
            }))}
            strokeColor="#FFD700"
            strokeWidth={3}
          />
        )}

        {/* Only show green marker for last location */}
        {locations.length > 0 && locations.at(-1) && (
          <Marker
            coordinate={{
              latitude: locations.at(-1)!.lat,
              longitude: locations.at(-1)!.lon,
            }}
            pinColor="green"
          />
        )}
      </MapView>
      {onFullscreenPress && (
        <TouchableOpacity style={styles.fullscreenButton} onPress={onFullscreenPress}>
          <IconSymbol name="arrow.up.left.and.arrow.down.right" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#3498DB',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
