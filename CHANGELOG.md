# Regalia Announcements Changelog

All notable changes to the Regalia Announcements (Capacitor + Android) project are documented in this file. This log is maintained by both the **Main Regalia Announcements Agent** and the **Code Auditor** to ensure high-fidelity tracking, auditing transparency, and precise technical detail.

---

## Changelog Format & Guidelines

Each entry is highly detailed and includes:
1. **Date & Author**: The timestamp and which agent made the change (Main Agent / Code Auditor).
2. **Summary**: A high-level overview of the task or purpose.
3. **Files Changed**: A clear list of files modified, created, or deleted.
4. **Technical Details**: Specific code modifications, function changes, architecture adjustments, or configuration updates.
5. **Verification & Auditing Status**: Details on how the changes were verified/tested and their audit phase status.

---

## [Released]

### [Release & Configuration Enhancements] - 2026-05-26

#### 1. Keystore Signatures & Release Configuration (`880a457`)
* **Author**: Main Regalia Announcements Agent
* **Files Changed**:
  * `regalia-announcements/android/app/build.gradle` (Modified)
  * `regalia-announcements/android/app/regalia.keystore` (New Bin)
* **Technical Details**:
  * Generated and embedded `regalia.keystore` inside `android/app/` directory to sign release and debug builds automatically.
  * Modified `android/app/build.gradle` to add `signingConfigs` block containing credentials and mapping for both `release` and `debug` build types. This ensures seamless app updates over existing installations on user devices without signature mismatch errors.

#### 2. Splash Screen UI Refinement (`a5f350e`)
* **Author**: Main Regalia Announcements Agent
* **Files Changed**:
  * `regalia-announcements/src/main.js` (Modified)
* **Technical Details**:
  * Resolved a visual overlap bug where the static fallback loading spinner remained visible during MP4 splash video playback.
  * Added an event listener to the video element to programmatically transition opacity and hide the `#fallback-loader` element (e.g. `display: none` / class removal) exactly when the video starts playing.

#### 3. Automatic Announcement Refresh (`9136181`)
* **Author**: Main Regalia Announcements Agent & Code Auditor
* **Files Changed**:
  * `regalia-announcements/src/main.js` (Modified)
* **Technical Details**:
  * Implemented an automatic periodic pull mechanism for fetching the latest announcements without requiring manual page reload or user intervention.
  * Configured a robust interval timer with clean component/page lifecycle teardown, ensuring no memory leaks occur when refreshing active announcement feeds.

#### 4. Notification Status Assets & Video Splash Integration (`dbb4439`)
* **Author**: Main Regalia Announcements Agent
* **Files Changed**:
  * `regalia-announcements/android/app/src/main/res/drawable/ic_stat_regalia_notification.png` (New)
  * `regalia-announcements/public/assets/splash.mp4` (New)
  * `regalia-announcements/capacitor.config.json` (Modified)
  * `regalia-announcements/index.html` (Modified)
  * `regalia-announcements/src/main.js` (Modified)
  * Multiple mipmap resources (`ic_launcher.png`, `ic_launcher_foreground.png`, `ic_launcher_round.png` across hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi) (Modified)
* **Technical Details**:
  * Integrated a high-definition video splash screen (`splash.mp4`) to show a modern, premium introductory animation.
  * Added the mandatory translucent/flat notification icon (`ic_stat_regalia_notification.png`) conforming to Android status bar design guidelines (resolves solid white block icon issue in Android 5.0+).
  * Updated `capacitor.config.json` to expose notification properties and configure default options.
  * Updated `index.html` markup to include the video splash container and absolute overlay components.

#### 5. Code Auditor Fixes & Vector Asset Tuning (`b1a30b7`)
* **Author**: Code Auditor
* **Files Changed**:
  * `regalia-announcements/android/app/src/main/res/values/ic_launcher_background.xml` (Modified)
  * `regalia-announcements/public/assets/logo.png` (Modified)
  * `regalia-announcements/src/main.js` (Modified)
  * Launcher icons in various mipmap formats (Modified)
* **Technical Details**:
  * Re-aligned launcher background configurations in `ic_launcher_background.xml` to match standard adaptive icon color schemes.
  * Re-scaled and compressed all mipmap launcher PNG assets to optimize build size and rendering sharpness.
  * Addressed auditing feedback in `src/main.js` concerning standard permission checking, local notification scheduling parameters, and robust fallback behaviors for haptic feedback triggers on legacy Android API levels.
