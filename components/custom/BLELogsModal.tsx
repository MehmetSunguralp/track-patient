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

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'data' | 'error' | 'info';
  message: string;
  data?: any;
}

interface BLELogsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BLELogsModal({ visible, onClose }: BLELogsModalProps) {
  const { logs, clearLogs, connectedDevice, receivedData } = useBLE();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (visible && scrollViewRef.current && logs.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs.length, visible]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  const formatData = (data: any): string => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }
    return String(data);
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'data':
        return 'antenna.radiowaves.left.and.right';
      case 'error':
        return 'exclamationmark.triangle.fill';
      case 'info':
        return 'info.circle';
      default:
        return 'circle';
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'data':
        return '#3498DB';
      case 'error':
        return '#E74C3C';
      case 'info':
        return '#F39C12';
      default:
        return '#ffffff';
    }
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
            <Text style={styles.headerTitle}>BLE Data Logs</Text>
            {connectedDevice && (
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {logs.length > 0 && (
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

        {receivedData && (
          <View style={styles.receivedDataContainer}>
            <Text style={styles.receivedDataLabel}>Last Received Data:</Text>
            <Text style={styles.receivedDataText} numberOfLines={2}>
              {receivedData.split('|')[0]}
            </Text>
          </View>
        )}

        {logs.length === 0 ? (
          <View style={styles.emptyLogsContainer}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={64} color="#687076" />
            <Text style={styles.emptyLogsText}>No logs yet</Text>
            <Text style={styles.emptyLogsSubtext}>
              {connectedDevice
                ? 'Waiting for data from the connected device...'
                : 'Connect to a device to see incoming data logs'}
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.logsContainer}
            contentContainerStyle={styles.logsContent}
            showsVerticalScrollIndicator={true}
          >
            {logs.map((log) => (
              <View key={log.id} style={[styles.logEntry, styles[`logEntry${log.type}`]]}>
                <View style={styles.logHeader}>
                  <IconSymbol
                    name={getLogIcon(log.type)}
                    size={16}
                    color={getLogColor(log.type)}
                  />
                  <Text style={[styles.logType, { color: getLogColor(log.type) }]}>
                    {log.type.toUpperCase()}
                  </Text>
                  <Text style={styles.logTimestamp}>{formatTimestamp(log.timestamp)}</Text>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
                {log.data && (
                  <View style={styles.logDataContainer}>
                    <Text style={styles.logDataLabel}>Data:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={true}
                      style={styles.logDataScroll}
                    >
                      <Text style={styles.logData} selectable>
                        {typeof log.data === 'object' && log.data.message
                          ? log.data.message
                          : formatData(log.data)}
                      </Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
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
  receivedDataContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  receivedDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#687076',
    marginBottom: 4,
  },
  receivedDataText: {
    fontSize: 12,
    color: '#11181C',
    fontFamily: 'monospace',
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
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logEntrydata: {
    borderLeftColor: '#3498DB',
  },
  logEntryerror: {
    borderLeftColor: '#E74C3C',
  },
  logEntryinfo: {
    borderLeftColor: '#F39C12',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logType: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#687076',
    marginLeft: 'auto',
  },
  logMessage: {
    fontSize: 14,
    color: '#11181C',
    marginBottom: 4,
    fontWeight: '500',
  },
  logDataContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logDataLabel: {
    fontSize: 11,
    color: '#687076',
    marginBottom: 4,
    fontWeight: '600',
  },
  logDataScroll: {
    maxHeight: 200,
  },
  logData: {
    fontSize: 11,
    color: '#11181C',
    fontFamily: 'monospace',
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

