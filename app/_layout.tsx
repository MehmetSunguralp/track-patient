import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

import { AppModeProvider } from '@/hooks/AppModeContext';
import { BLEProvider } from '@/hooks/BLEContext';
import { PatientsProvider } from '@/hooks/PatientsContext';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  useEffect(() => {
    // Hide the "Open debugger to view warnings" message on first render
    LogBox.ignoreAllLogs(true);
    // Re-enable after a short delay to allow warnings to be logged but not shown initially
    const timer = setTimeout(() => {
      LogBox.ignoreAllLogs(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppModeProvider>
      <BLEProvider>
        <PatientsProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="dark" hidden />
        </PatientsProvider>
      </BLEProvider>
    </AppModeProvider>
  );
}
