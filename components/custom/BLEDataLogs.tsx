import { useBLE } from '@/hooks/BLEContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'data' | 'error' | 'info';
  message: string;
  data?: any;
}

export default function BLEDataLogs() {
  const { logs, clearLogs, connectedDevice, receivedData } = useBLE();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollViewRef.current && logs.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs.length]);

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

  if (!connectedDevice) {
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="antenna.radiowaves.left.and.right" size={48} color="#687076" />
        <Text style={styles.emptyText}>No device connected</Text>
        <Text style={styles.emptySubtext}>Connect to a BLE device to see data logs</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <IconSymbol name="antenna.radiowaves.left.and.right" size={20} color="#3498DB" />
          <Text style={styles.headerTitle}>BLE Data Logs</Text>
          <View style={styles.logCountBadge}>
            <Text style={styles.logCountText}>{logs.length}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {logs.length > 0 && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              style={styles.clearButton}
            >
              <IconSymbol name="xmark" size={16} color="#ffffff" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          )}
          <IconSymbol
            name={isExpanded ? 'chevron.up' : 'chevron.down'}
            size={20}
            color="#ffffff"
            style={styles.chevron}
          />
        </View>
      </Pressable>

      {isExpanded && (
        <>
          {logs.length === 0 ? (
            <View style={styles.emptyLogsContainer}>
              <Text style={styles.emptyLogsText}>Waiting for data...</Text>
              <Text style={styles.emptyLogsSubtext}>
                Data from the connected device will appear here
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
                      <Text style={styles.logData}>{formatData(log.data)}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  logCountBadge: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  logCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
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
  logData: {
    fontSize: 12,
    color: '#11181C',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
  },
  emptyLogsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyLogsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 8,
  },
  emptyLogsSubtext: {
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
  },
});

