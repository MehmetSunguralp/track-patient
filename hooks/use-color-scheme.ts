/**
 * Force light theme across the app.
 *
 * This overrides the system color scheme and always returns 'light'.
 * If you want to re-enable automatic color scheme detection, replace
 * the implementation with: export { useColorScheme } from 'react-native';
 */
export function useColorScheme(): 'light' | 'dark' {
  return 'light';
}
