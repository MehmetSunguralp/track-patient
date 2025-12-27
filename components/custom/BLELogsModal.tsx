import { useBLE } from '@/hooks/BLEContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BLELogsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BLELogsModal({ visible, onClose }: BLELogsModalProps) {
  const { rawDataLogs, clearLogs, connectedDevice } = useBLE();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll to bottom when new logs arrive (only if not paused)
  useEffect(() => {
    if (visible && !isPaused && scrollViewRef.current && rawDataLogs.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [rawDataLogs.length, visible, isPaused]);

  const formatTimestamp = () => {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={24} color="#3498DB" />
            <Text style={styles.headerTitle}>BLE Raw Data Logs</Text>
            {connectedDevice && (
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => setIsPaused(!isPaused)}
              style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
            >
              <IconSymbol 
                name={isPaused ? "play.fill" : "pause.fill"} 
                size={18} 
                color="#ffffff" 
              />
              <Text style={styles.pauseButtonText}>{isPaused ? "Resume" : "Pause"}</Text>
            </Pressable>
            {rawDataLogs.length > 0 && (
              <Pressable
                onPress={clearLogs}
                style={styles.clearButton}
              >
                <IconSymbol name="trash" size={18} color="#ffffff" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#11181C" />
            </Pressable>
          </View>
        </View>

        {rawDataLogs.length === 0 ? (
          <View style={styles.emptyLogsContainer}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={64} color="#687076" />
            <Text style={styles.emptyLogsText}>No data yet</Text>
            <Text style={styles.emptyLogsSubtext}>
              {connectedDevice
                ? 'Waiting for data from the connected device...'
                : 'Connect to a device to see incoming data logs'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                Total chunks: {rawDataLogs.length} {isPaused && '(Paused)'}
              </Text>
            </View>
            <ScrollView
              ref={scrollViewRef}
              style={styles.logsContainer}
              contentContainerStyle={styles.logsContent}
              showsVerticalScrollIndicator={true}
            >
              {rawDataLogs.map((rawData, index) => (
                <View key={index} style={styles.logEntry}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logIndex}>#{index + 1}</Text>
                    <Text style={styles.logTimestamp}>
                      {new Date().toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.logData} selectable>
                    {rawData}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27AE60',
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27AE60',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F39C12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pauseButtonActive: {
    backgroundColor: '#27AE60',
  },
  pauseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#687076',
  },
  logsContainer: {
    flex: 1,
  },
  logsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  logEntry: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#687076',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#687076',
  },
  logData: {
    fontSize: 12,
    color: '#11181C',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  emptyLogsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyLogsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLogsSubtext: {
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
    lineHeight: 20,
  },
});
