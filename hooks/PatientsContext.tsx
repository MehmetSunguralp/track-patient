import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

import { Patient, patients as initialPatients } from '@/data/patients';

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
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatients[0]?.id ?? '');

  const value = useMemo<PatientsContextValue>(() => {
    const selectedPatient =
      initialPatients.find((patient) => patient.id === selectedPatientId) ?? initialPatients[0];

    return {
      patients: initialPatients,
      selectedPatientId: selectedPatient.id,
      selectedPatient,
      setSelectedPatientId,
    };
  }, [selectedPatientId]);

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
}

export function usePatients() {
  const context = useContext(PatientsContext);

  if (!context) {
    throw new Error('usePatients must be used within a PatientsProvider');
  }

  return context;
}
