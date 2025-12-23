import { ReactNode, createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

import { Patient, patients as initialPatients, SessionData } from '@/data/patients';
import { useAppMode } from './AppModeContext';
import { useBLE } from './BLEContext';

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

// Parse BLE JSON data and extract patient ID
function parseBLEData(jsonString: string): { patientId: string; data: SessionData['data'][0] } | null {
  // Validate input
  if (!jsonString || typeof jsonString !== 'string' || jsonString.trim().length === 0) {
    return null;
  }

  // Check if it looks like JSON (starts with { and ends with })
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const data = JSON.parse(jsonString);
    
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

export function PatientsProvider({ children }: PatientsProviderProps) {
  const { isProductionMode } = useAppMode();
  const { connectedDevice, receivedData } = useBLE();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [blePatients, setBlePatients] = useState<Map<string, Patient>>(new Map());

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
    
    // Only process if it looks like JSON (starts with {)
    // Skip simple text messages like "hello world"
    if (!message.trim().startsWith('{')) {
      // Not JSON, skip processing (this is expected for test messages)
      return;
    }
    
    console.log(`[PatientsContext] Processing JSON data (length: ${message.length}): ${message.substring(0, 150)}`);
    
    // Parse the received data (now includes patientId)
    const parsed = parseBLEData(message);
    if (!parsed || !parsed.patientId) {
      // Failed to parse - skip silently (might be malformed JSON)
      return;
    }
    
    console.log(`[PatientsContext] Successfully parsed data for patient: ${parsed.patientId}`);

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
        // Update existing patient's data - keep last 6 points for charts
        const sessionData = existingPatient.data;
        if (sessionData) {
          const newDataArray = [...(sessionData.data || []), parsedData].slice(-6);
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
        firstDataPoint: patient.data?.data?.[0] ? {
          timestamp: patient.data?.data?.[0]?.timestamp,
          bpm: patient.data?.data?.[0]?.heart?.bpm,
          lat: patient.data?.data?.[0]?.gps?.lat,
        } : 'missing'
      });
      
      // Force re-render by ensuring the map is new
      return new Map(newMap);
    });
  }, [receivedData, connectedDevice, isProductionMode]);

  // Auto-select patient when first data arrives
  useEffect(() => {
    if (!isProductionMode || !connectedDevice) return;
    
    const patients = Array.from(blePatients.values());
    const patientWithData = patients.find((p) => p.data && p.data.data && p.data.data.length > 0);
    
    if (patientWithData && (!selectedPatientId || selectedPatientId === '')) {
      console.log(`[BLE] Auto-selecting patient ${patientWithData.id} with data`);
      setSelectedPatientId(patientWithData.id);
    }
  }, [blePatients, isProductionMode, connectedDevice, selectedPatientId]);

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
  useEffect(() => {
    const patients = isProductionMode
      ? Array.from(blePatients.values())
      : initialPatients;
    
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
  }, [blePatients, isProductionMode, selectedPatientId]);

  const value = useMemo<PatientsContextValue>(() => {
    // In production mode, use BLE patients if connected, otherwise empty array
    // In test mode, use all patients with dummy data
    const patients = isProductionMode
      ? Array.from(blePatients.values())
      : initialPatients;

    // Find selected patient, fallback to first patient if not found
    let selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
    if (!selectedPatient && patients.length > 0) {
      selectedPatient = patients[0];
    }

    return {
      patients,
      selectedPatientId: selectedPatient?.id ?? '',
      selectedPatient: selectedPatient ?? {
        id: '',
        uuid: '',
        firstName: '',
        lastName: '',
        sex: 'male',
        age: 0,
        avatarUrl: '',
        isConnected: false,
        data: null,
      },
      setSelectedPatientId,
    };
  }, [selectedPatientId, isProductionMode, blePatients]);

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
}

export function usePatients() {
  const context = useContext(PatientsContext);

  if (!context) {
    throw new Error('usePatients must be used within a PatientsProvider');
  }

  return context;
}
