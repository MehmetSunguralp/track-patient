import { ReactNode, createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';

import { Patient, patients as initialPatients, SessionData } from '@/data/patients';
import { useAppMode } from './AppModeContext';
import { useBLE } from './BLEContext';
import { parsePacket, livePacketToPatientData, totalPacketToPatientData, PacketType } from '@/utils/packetParser';

interface PatientsContextValue {
  readonly patients: Patient[];
  readonly selectedPatientId: string;
  readonly selectedPatient: Patient;
  readonly setSelectedPatientId: (id: string) => void;
}

const PatientsContext = createContext<PatientsContextValue | undefined>(undefined);

interface PatientsProviderProps {
  readonly children: ReactNode;
}

// Helper to create patient with only ID (no names/avatars - all data from BLE)
function createPatientFromId(patientId: string, isOnline: boolean): Omit<Patient, 'data'> {
  const patientKey = `ble-${patientId}`;
  return {
    id: patientKey,
    uuid: patientId.toUpperCase(),
    firstName: '', // No names in production mode
    lastName: '',
    sex: 'male' as const, // Default, not used in UI
    age: 0, // Not used in UI
    avatarUrl: '', // No avatars in production mode
    isConnected: isOnline,
  };
}

// Parse BLE data - supports both JSON and ASCII packet formats
function parseBLEData(dataString: string): { patientId: string; data: SessionData['data'][0] } | null {
  // Validate input
  if (!dataString || typeof dataString !== 'string' || dataString.trim().length === 0) {
    return null;
  }

  const trimmed = dataString.trim();
  
  // Check if it's an ASCII packet (starts with L, T, or S)
  if (trimmed.match(/^[LTS]/)) {
    try {
      console.log(`[PatientsContext] Attempting to parse ASCII packet: ${trimmed.substring(0, 20)}...`);
      const parsedPacket = parsePacket(trimmed);
      if (!parsedPacket) {
        console.log(`[PatientsContext] parsePacket returned null for: ${trimmed.substring(0, 30)}...`);
        return null;
      }
      
      console.log(`[PatientsContext] Parsed packet type: ${parsedPacket.type}, podId: ${parsedPacket.podId}`);
      
      // Convert packet to patient data format
      if (parsedPacket.type === PacketType.LIVE) {
        const result = livePacketToPatientData(parsedPacket);
        console.log(`[PatientsContext] Converted Live packet: patientId=${result.patientId}, bpm=${result.data.heart.bpm}`);
        return result;
      } else if (parsedPacket.type === PacketType.TOTAL) {
        const result = totalPacketToPatientData(parsedPacket);
        console.log(`[PatientsContext] Converted Total packet: patientId=${result.patientId}`);
        return result;
      } else if (parsedPacket.type === PacketType.STATUS) {
        // Status packets don't contain patient data, skip
        console.log(`[PatientsContext] Status packet received, skipping`);
        return null;
      }
    } catch (error) {
      console.log('[PatientsContext] Error parsing ASCII packet:', error);
      return null;
    }
  }
  
  // Check if it's JSON (starts with { and ends with })
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(dataString);
      
      // Validate that we have at least some data structure
      if (!data || typeof data !== 'object') {
        return null;
      }
      
      // Extract patient ID (required)
      const patientId = data.patientId || data.patient_id || null;
      if (!patientId || typeof patientId !== 'string') {
        return null;
      }
      
      return {
        patientId,
        data: {
          timestamp: data.timestamp ? new Date(Number(data.timestamp) * 1000).toISOString() : new Date().toISOString(),
          gps: {
            lat: data.gps?.lat ?? 0,
            lon: data.gps?.lon ?? 0,
            speedKmh: data.gps?.speedKmh ?? 0,
            distanceTotalM: data.gps?.distanceTotalM ?? 0,
          },
          heart: {
            bpm: data.heart?.bpm ?? 0,
            rrMs: data.heart?.rrMs ?? 0,
            maxBpmSession: data.heart?.maxBpmSession ?? 0,
          },
          movement: {
            metabolicPowerWkg: data.movement?.metabolicPowerWkg ?? 0,
            activityZone: data.movement?.activityZone ?? 'Z1',
            stepBalanceSide: data.movement?.stepBalanceSide ?? 'left',
            stepBalancePercent: data.movement?.stepBalancePercent ?? 0,
          },
          temperature: {
            skinC: data.temperature?.skinC ?? 36.5,
          },
        },
      };
    } catch (error) {
      // Silently fail - don't log errors for incomplete data
      return null;
    }
  }
  
  // Unknown format
  return null;
}

export function PatientsProvider({ children }: PatientsProviderProps) {
  const { isProductionMode } = useAppMode();
  const { connectedDevice, receivedData } = useBLE();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [blePatients, setBlePatients] = useState<Map<string, Patient>>(new Map());
  const [dataVersion, setDataVersion] = useState(0); // Increment when data actually changes

  // Update BLE patients when data is received
  useEffect(() => {
    console.log(`[PatientsContext] useEffect triggered - isProductionMode: ${isProductionMode}, connectedDevice: ${!!connectedDevice}, receivedData length: ${receivedData?.length || 0}`);
    
    if (!isProductionMode || !connectedDevice) {
      console.log(`[PatientsContext] Skipping - not in production mode or no device connected`);
      return;
    }

    // Skip if receivedData is empty or invalid
    if (!receivedData || typeof receivedData !== 'string' || receivedData.trim().length === 0) {
      return;
    }
    
    // Extract the actual message (remove timestamp suffix if present)
    const message = receivedData.includes('|') 
      ? receivedData.split('|')[0] 
      : receivedData;
    
    // Process if it's an ASCII packet (L/T/S) or JSON
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return;
    }
    
    // Skip if it's neither a packet nor JSON
    if (!trimmed.match(/^[LTS]/) && !trimmed.startsWith('{')) {
      // Unknown format, skip processing
      return;
    }
    
    console.log(`[PatientsContext] Processing data (length: ${message.length}): ${message.substring(0, 150)}`);
    
    // Parse the received data (supports both ASCII packets and JSON)
    const parsed = parseBLEData(message);
    if (!parsed || !parsed.patientId) {
      // Failed to parse - log for debugging
      console.log(`[PatientsContext] ❌ Failed to parse data. Message length: ${message.length}, starts with: ${message.substring(0, 5)}`);
      return;
    }
    
    console.log(`[PatientsContext] ✅ Successfully parsed data for patient: ${parsed.patientId}, bpm: ${parsed.data.heart.bpm}, lat: ${parsed.data.gps.lat}, lon: ${parsed.data.gps.lon}`);

    const { patientId, data: parsedData } = parsed;
    
    // Use patientId as the key instead of deviceId
    // Ensure patientId is in the format "p1", "p2", etc.
    const cleanPatientId = patientId.startsWith('p') ? patientId : `p${patientId}`;
    const patientKey = `ble-${cleanPatientId}`;
    
    // All patients from BLE are considered online/connected
    const isOnlinePatient = true;

    setBlePatients((prev) => {
      const newMap = new Map(prev);
      const existingPatient = newMap.get(patientKey);
      
        // Debug: log when data is received
      console.log(`[BLE] Received data for ${patientKey}, existing: ${!!existingPatient}, hasData: ${!!existingPatient?.data}, dataLength: ${existingPatient?.data?.data?.length || 0}`);
      
      let patient: Patient;
      if (existingPatient) {
        // Update existing patient's data - keep last 100 points for charts
        const sessionData = existingPatient.data;
        if (sessionData && sessionData.data && sessionData.data.length > 0) {
          // Merge new data with the latest existing data point
          const latestExisting = sessionData.data[sessionData.data.length - 1];
          
          // Smart merge: preserve non-zero values, prefer new values if they're non-zero
          // For numbers: use incoming if non-zero, otherwise keep existing
          // For strings: use incoming if non-empty, otherwise keep existing
          const mergeValue = (existing: any, incoming: any) => {
            if (typeof incoming === 'number') {
              // For numbers, use incoming if it's non-zero, otherwise keep existing
              return incoming !== 0 ? incoming : (existing !== 0 ? existing : incoming);
            } else if (typeof incoming === 'string') {
              // For strings, use incoming if it's non-empty and not default values
              return incoming && incoming !== '' && incoming !== 'Z1' && incoming !== 'left' 
                ? incoming 
                : (existing && existing !== '' ? existing : incoming);
            }
            // For other types, prefer incoming if it exists
            return incoming !== null && incoming !== undefined ? incoming : existing;
          };
          
          const mergedData = {
            timestamp: parsedData.timestamp || latestExisting.timestamp, // Use latest timestamp
            gps: {
              lat: mergeValue(latestExisting.gps.lat, parsedData.gps.lat),
              lon: mergeValue(latestExisting.gps.lon, parsedData.gps.lon),
              speedKmh: mergeValue(latestExisting.gps.speedKmh, parsedData.gps.speedKmh),
              distanceTotalM: mergeValue(latestExisting.gps.distanceTotalM, parsedData.gps.distanceTotalM),
            },
            heart: {
              bpm: mergeValue(latestExisting.heart.bpm, parsedData.heart.bpm),
              rrMs: mergeValue(latestExisting.heart.rrMs, parsedData.heart.rrMs),
              maxBpmSession: mergeValue(latestExisting.heart.maxBpmSession, parsedData.heart.maxBpmSession),
            },
            movement: {
              metabolicPowerWkg: mergeValue(latestExisting.movement.metabolicPowerWkg, parsedData.movement.metabolicPowerWkg),
              activityZone: parsedData.movement.activityZone || latestExisting.movement.activityZone || 'Z1',
              stepBalanceSide: parsedData.movement.stepBalanceSide || latestExisting.movement.stepBalanceSide || 'left',
              stepBalancePercent: mergeValue(latestExisting.movement.stepBalancePercent, parsedData.movement.stepBalancePercent),
            },
            temperature: {
              skinC: mergeValue(latestExisting.temperature.skinC, parsedData.temperature.skinC),
            },
          };
          
          // Check if this is a new Live packet (has GPS coordinates) or a Total packet (no GPS, update in place)
          const isNewLivePacket = parsedData.gps.lat !== 0 && parsedData.gps.lon !== 0;
          
          let newDataArray;
          if (isNewLivePacket) {
            // New Live packet - use parsed data directly (don't merge), add as new data point
            newDataArray = [...sessionData.data, parsedData].slice(-6);
          } else {
            // Total packet - merge with latest data point in place
            newDataArray = [...sessionData.data.slice(0, -1), mergedData].slice(-6);
          }
          
          patient = {
            ...existingPatient,
            isConnected: true,
            data: {
              ...sessionData,
              data: newDataArray,
            },
          };
        } else {
          // Create new session data
          patient = {
            ...existingPatient,
            isConnected: true,
            data: {
              id: patientKey,
              sessionId: `SESSION_BLE_${cleanPatientId}`,
              intervalSeconds: 5, // 5 seconds as per ESP32
              data: [parsedData],
            },
          };
        }
      } else {
        // Create new patient - only ID, no names/avatars
        const patientInfo = createPatientFromId(cleanPatientId, isOnlinePatient);
        
        patient = {
          ...patientInfo,
          id: patientKey,
          isConnected: true,
          data: {
            id: patientKey,
            sessionId: `SESSION_BLE_${cleanPatientId}`,
            intervalSeconds: 5, // 5 seconds as per ESP32
            data: [parsedData],
          },
        };
      }
      
      newMap.set(patientKey, patient);
      console.log(`[BLE] ✅ Updated patient ${patientKey}, data points: ${patient.data?.data?.length || 0}, isConnected: ${patient.isConnected}`);
      console.log(`[BLE] Patient data structure:`, {
        id: patient.id,
        hasData: !!patient.data,
        dataId: patient.data?.id,
        dataLength: patient.data?.data?.length,
        latestDataPoint: patient.data?.data?.[patient.data.data.length - 1] ? {
          timestamp: patient.data?.data?.[patient.data.data.length - 1]?.timestamp,
          bpm: patient.data?.data?.[patient.data.data.length - 1]?.heart?.bpm,
          lat: patient.data?.data?.[patient.data.data.length - 1]?.gps?.lat,
          lon: patient.data?.data?.[patient.data.data.length - 1]?.gps?.lon,
        } : 'missing'
      });
      
      // Force re-render by ensuring the map is new
      const newMapInstance = new Map(newMap);
      // Increment version to trigger useMemo updates
      setDataVersion(prev => prev + 1);
      return newMapInstance;
    });
  }, [receivedData, connectedDevice, isProductionMode]);

  // Auto-select patient when first data arrives (only once)
  const hasAutoSelectedRef = useRef(false);
  const prevPatientsSizeRef = useRef(0);
  useEffect(() => {
    if (!isProductionMode || !connectedDevice || hasAutoSelectedRef.current) return;
    
    // Only check when patient count changes (new data added)
    const currentSize = blePatients.size;
    if (currentSize === prevPatientsSizeRef.current) return;
    prevPatientsSizeRef.current = currentSize;
    
    const patients = Array.from(blePatients.values());
    const patientWithData = patients.find((p) => p.data && p.data.data && p.data.data.length > 0);
    
    if (patientWithData && (!selectedPatientId || selectedPatientId === '')) {
      console.log(`[BLE] Auto-selecting patient ${patientWithData.id} with data`);
      setSelectedPatientId(patientWithData.id);
      hasAutoSelectedRef.current = true;
    }
  }, [blePatients.size, isProductionMode, connectedDevice, selectedPatientId]);

  // Create patient when device connects (before data arrives)
  useEffect(() => {
    if (!isProductionMode || !connectedDevice) {
      if (!connectedDevice) {
        // Clear patients when disconnected
        setBlePatients(new Map());
        setSelectedPatientId('');
      }
      return;
    }

    // Create single patient (p1) when connection is established
    setBlePatients((prev) => {
      const newMap = new Map(prev);
      const patientKey = 'ble-p1';
      
      // Only create if not already present
      if (!newMap.has(patientKey)) {
        const patientInfo = createPatientFromId('p1', true);
        newMap.set(patientKey, {
          ...patientInfo,
          id: patientKey,
          isConnected: true,
          data: undefined, // No data yet - will be populated when first data arrives
        });
        console.log(`[PatientsContext] Created patient ${patientKey} on connection`);
      }
      
      return new Map(newMap);
    });
  }, [connectedDevice, isProductionMode]);

  // Auto-select first patient when patients list changes
  const prevPatientsSizeRef2 = useRef(0);
  useEffect(() => {
    const patients = isProductionMode
      ? Array.from(blePatients.values())
      : initialPatients;
    
    // Only check when patient count changes or in test mode
    const currentSize = isProductionMode ? blePatients.size : initialPatients.length;
    if (isProductionMode && currentSize === prevPatientsSizeRef2.current) return;
    prevPatientsSizeRef2.current = currentSize;
    
    // Only auto-select if:
    // 1. We have patients
    // 2. No patient is currently selected, OR the selected patient doesn't exist in the current list
    if (patients.length > 0) {
      const currentSelectedExists = patients.find((p) => p.id === selectedPatientId);
      if (!currentSelectedExists) {
        // Find first patient with data in production mode, or just first patient in test mode
        const patientToSelect = isProductionMode
          ? patients.find((p) => p.data && p.data.data && p.data.data.length > 0) || patients[0]
          : patients[0];
        if (patientToSelect) {
          setSelectedPatientId(patientToSelect.id);
        }
      }
    } else if (isProductionMode) {
      // No patients in production mode, clear selection
      setSelectedPatientId('');
    }
  }, [blePatients.size, isProductionMode, selectedPatientId, initialPatients.length]);

  // Use dataVersion to track when data actually changes (incremented in setBlePatients)

  // Memoize patients array separately to prevent unnecessary re-creation
  const patientsArray = useMemo(() => {
    return isProductionMode
      ? Array.from(blePatients.values())
      : initialPatients;
  }, [isProductionMode, dataVersion, blePatients.size]);

  // Memoize selected patient separately
  const selectedPatientMemo = useMemo(() => {
    const found = patientsArray.find((patient) => patient.id === selectedPatientId);
    if (found) return found;
    if (patientsArray.length > 0) return patientsArray[0];
    return {
      id: '',
      uuid: '',
      firstName: '',
      lastName: '',
      sex: 'male' as const,
      age: 0,
      avatarUrl: '',
      isConnected: false,
      data: null,
    };
  }, [patientsArray, selectedPatientId]);

  // setSelectedPatientId is stable (from useState), so we can include it safely
  const value = useMemo<PatientsContextValue>(() => {
    return {
      patients: patientsArray,
      selectedPatientId: selectedPatientMemo.id,
      selectedPatient: selectedPatientMemo,
      setSelectedPatientId,
    };
  }, [patientsArray, selectedPatientMemo, setSelectedPatientId]);

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
}

export function usePatients() {
  const context = useContext(PatientsContext);

  if (!context) {
    throw new Error('usePatients must be used within a PatientsProvider');
  }

  return context;
}
