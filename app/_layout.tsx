import { LightTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppModeProvider } from '@/hooks/AppModeContext';
import { BLEProvider } from '@/hooks/BLEContext';
import { PatientsProvider } from '@/hooks/PatientsContext';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  return (
    <AppModeProvider>
      <BLEProvider>
        <PatientsProvider>
          <Stack theme={LightTheme}>
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
