import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FullscreenMapViewProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly locations: { lat: number; lon: number }[];
}

export default function FullscreenMapView({ visible, onClose, locations }: FullscreenMapViewProps) {
  const insets = useSafeAreaInsets();
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
    // Fit map to show all locations when modal opens
    if (visible && locations.length > 0 && mapRef.current) {
      const coordinates = locations.map((loc) => ({
        latitude: loc.lat,
        longitude: loc.lon,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [visible, locations]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={calculateRegion()}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
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
        <TouchableOpacity style={[styles.closeButton, { top: insets.top + 12 }]} onPress={onClose}>
          <IconSymbol name="xmark" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
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
