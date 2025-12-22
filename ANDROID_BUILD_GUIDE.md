# Android Local Build Guide

## Configuration Changes Made

✅ **Android Permissions Added to `app.json`:**

- `BLUETOOTH` - Required for Bluetooth operations (Android < 12)
- `BLUETOOTH_ADMIN` - Required for Bluetooth administration (Android < 12)
- `BLUETOOTH_SCAN` - Required for scanning BLE devices (Android 12+)
- `BLUETOOTH_CONNECT` - Required for connecting to BLE devices (Android 12+)
- `ACCESS_FINE_LOCATION` - Required for BLE scanning on all Android versions
- `ACCESS_COARSE_LOCATION` - Alternative location permission

These permissions will be automatically added to `AndroidManifest.xml` when you run `npx expo prebuild`.

## Do You Need Android Studio?

**Yes, you need Android Studio for local Android builds.** Here's why:

### Required Components:

1. **Android SDK** - Comes with Android Studio
2. **Android SDK Build Tools** - For compiling the app
3. **Android Emulator** (optional but recommended) - For testing without a physical device
4. **Java Development Kit (JDK)** - Usually bundled with Android Studio

### Alternative: EAS Build (Cloud Build)

If you don't want to install Android Studio, you can use **EAS Build** (Expo's cloud build service):

- No local setup required
- Builds in the cloud
- Requires Expo account (free tier available)

## Local Build Steps

### 1. Install Android Studio

1. Download from: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio and go through the setup wizard
4. Install Android SDK (API level 33 or higher recommended)
5. Install Android SDK Build Tools
6. Install Android Emulator (optional)

### 2. Set Up Environment Variables

Add to your system PATH:

- `ANDROID_HOME` = Path to Android SDK (usually `C:\Users\YourName\AppData\Local\Android\Sdk` on Windows)
- Add to PATH: `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\tools`

### 3. Generate Native Android Project

```bash
npx expo prebuild --platform android
```

This creates the `android/` folder with native Android code.

### 4. Build and Run

**Option A: Using Expo CLI (Recommended)**

```bash
npx expo run:android
```

This will:

- Build the app
- Install on connected device/emulator
- Start Metro bundler

**Option B: Using Android Studio**

```bash
npx expo prebuild
```

Then:

1. Open `android/` folder in Android Studio
2. Wait for Gradle sync
3. Click "Run" button or press Shift+F10

**Option C: Using Gradle directly**

```bash
cd android
./gradlew assembleDebug
./gradlew installDebug
```

### 5. Connect Physical Device (Optional)

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect via USB
4. Run `adb devices` to verify connection
5. Run `npx expo run:android`

## Important Notes

### For BLE to Work:

- ✅ Permissions are already configured in `app.json`
- ✅ Code handles runtime permission requests
- ✅ Works on Android 6.0+ (API 23+)
- ⚠️ **Physical device recommended** - BLE doesn't work well on emulators

### Troubleshooting

**"SDK location not found"**

- Set `ANDROID_HOME` environment variable
- Or create `local.properties` in `android/` folder:
  ```
  sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
  ```

**"Command not found: adb"**

- Add Android SDK platform-tools to PATH
- Or use full path: `%ANDROID_HOME%\platform-tools\adb`

**BLE not working**

- Ensure you're using a **development build** (not Expo Go)
- Check that permissions are granted in device settings
- Verify Bluetooth is enabled on device
- Test on physical device (emulators have limited BLE support)

## Quick Start Commands

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build and run on connected device/emulator (installs but APK location may vary)
npx expo run:android

# Build APK file directly (RECOMMENDED for getting APK)
cd android
./gradlew assembleDebug
# APK will be in: android/app/build/outputs/apk/debug/app-debug.apk

# Build Release APK (for distribution)
./gradlew assembleRelease
# APK will be in: android/app/build/outputs/apk/release/app-release.apk
```

## Getting Your APK File

### Method 1: Build APK Directly (Easiest)

After running `npx expo prebuild --platform android`:

```bash
cd android
./gradlew assembleDebug
```

**APK Location:**

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk` (requires signing)

### Method 2: Using Expo Run (APK may be in temp folder)

```bash
npx expo run:android
```

This installs the app but the APK location varies. Use Method 1 for a reliable APK path.

### Method 3: EAS Build (Cloud - Download APK)

```bash
eas build --platform android --profile preview
```

- Builds in the cloud
- Provides download link for APK
- No local Android Studio needed
- Requires Expo account (free tier available)

## Next Steps

After successful build:

1. Test BLE scanning functionality
2. Connect to your IoT device
3. Verify data flow from device to app

For more information, see:

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android Setup Guide](https://reactnative.dev/docs/environment-setup)
