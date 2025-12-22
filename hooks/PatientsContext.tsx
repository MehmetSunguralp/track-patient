import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

import { Patient, patients as initialPatients } from '@/data/patients';
import { useAppMode } from './AppModeContext';

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

export function PatientsProvider({ children }: PatientsProviderProps) {
  const { isProductionMode } = useAppMode();
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatients[0]?.id ?? '');

  const value = useMemo<PatientsContextValue>(() => {
    // In production mode, hide all patients (return empty array)
    // In test mode, use all patients with dummy data
    const patients = isProductionMode ? [] : initialPatients;

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
  }, [selectedPatientId, isProductionMode]);

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
}

export function usePatients() {
  const context = useContext(PatientsContext);

  if (!context) {
    throw new Error('usePatients must be used within a PatientsProvider');
  }

  return context;
}
