import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

type AppMode = 'test' | 'production';

interface AppModeContextValue {
  readonly mode: AppMode;
  readonly isProductionMode: boolean;
  readonly toggleMode: () => void;
  readonly setMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

interface AppModeProviderProps {
  readonly children: ReactNode;
}

export function AppModeProvider({ children }: AppModeProviderProps) {
  const [mode, setModeState] = useState<AppMode>('test');

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'test' ? 'production' : 'test'));
  }, []);

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
  }, []);

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode,
      isProductionMode: mode === 'production',
      toggleMode,
      setMode,
    }),
    [mode, toggleMode, setMode]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const context = useContext(AppModeContext);

  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }

  return context;
}
