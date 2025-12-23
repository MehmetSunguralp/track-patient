# Google Maps API Key Setup

## Issue
The app shows an error when viewing test patients because `react-native-maps` requires a Google Maps API key for Android.

## Solution

### Option 1: Get a Real API Key (Recommended for Production)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Maps SDK for Android" API
4. Create credentials (API Key)
5. Restrict the API key to your app's package name
6. Update `app.json`:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
       }
     }
   }
   ```

### Option 2: Use Development Key (Current Setup)
The app.json currently has a dummy key that will work for development but may show warnings.

### After Updating API Key
Run prebuild to apply changes:
```bash
npx expo prebuild --platform android
npx expo run:android
```

## Note
- The Maps API key is only needed for Android
- iOS uses Apple Maps by default
- For test mode, you can also disable the map view if you don't need it

