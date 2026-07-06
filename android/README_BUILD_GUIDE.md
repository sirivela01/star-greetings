# Android Studio Build & Publishing Guide

This guide walks you through building, testing, and generating the APK/AAB for the **Google Play Store** using the native Android Studio project in this folder.

---

## 🛠️ Step 1: Open the Project in Android Studio

1. Download and install **[Android Studio](https://developer.android.com/studio)** if you haven't already.
2. Open Android Studio.
3. Click **Open** (or **File > Open**).
4. Navigate to your project folder and select the `android` folder, then click **OK**.
5. Wait for Android Studio to finish indexing and downloading Gradle dependencies (this might take a few minutes on the first run).

---

## 🎨 Step 2: Configure Your App Logo (Launcher Icon)

Android Studio has a built-in tool called **Asset Studio** to automatically generate all launcher icon sizes from your custom logo:

1. In the left-hand project tree, right-click on the `app` folder.
2. Select **New > Image Asset**.
3. In the **Configure Image Asset** window:
   * **Icon Type**: Select `Launcher Icons (Adaptive and Legacy)`.
   * **Name**: Keep it as `ic_launcher`.
   * **Asset Type**: Select `Image`.
   * **Path**: Click the folder icon and select `icon.png` (which is located in the root of the `android/` folder).
4. In the **Scaling** section:
   * Adjust the slider under **Resize** so that your logo fits nicely inside the grid circle (usually around `70%` to `80%`).
5. Click **Next** and then click **Finish**.
   * *This automatically replaces all placeholder launcher icons with your custom monogram logo!*

---

## 📱 Step 3: Run & Test the App

1. Connect your Android phone to your laptop via USB and enable **USB Debugging** (in Developer Options on your phone).
2. Or, set up a Virtual Device (Emulator) using the **Device Manager** in Android Studio.
3. In the top toolbar, select your device/emulator in the dropdown menu next to the play button.
4. Click the green **Run (Play)** button (`Shift + F10`).
5. The game will build and launch on your phone. Play around to verify that animations, sounds, and online matchmaking work perfectly!

---

## 🚀 Step 4: Build the Signed APK/AAB for the Play Store

To publish your app on the Google Play Store, you need to generate a signed **Android App Bundle (AAB)**:

1. In the top menu, select **Build > Generate Signed Bundle / APK...**.
2. Select **Android App Bundle** and click **Next**.
3. **Key store path**:
   * If you don't have a keystore yet, click **Create new...**.
   * Choose a path to save the keystore file (e.g. your Documents folder), enter a secure password, and fill in your certificate details.
   * *IMPORTANT: Store this keystore file and passwords in a secure backup. You will need the exact same key to sign future updates for the Play Store!*
4. Enter your Key alias and passwords, then click **Next**.
5. **Build Variant**: Select `release`.
6. Click **Create** (or **Finish**).
7. Once the build completes, a popup notification will appear at the bottom-right. Click **locate** to open the folder containing your signed `.aab` file!
8. Upload this `.aab` file to your **Google Play Console** dashboard under your app's release track.

---

## 🔄 Step 5: How to Update the App in the Future

If you make any changes to the code or assets:
1. Make your changes in the main project web files.
2. Run the sync scripts in your project terminal:
   ```bash
   python build.py
   python generate_android_project.py
   ```
3. Re-open Android Studio and run **Build > Generate Signed Bundle / APK...** again to compile the updated app.
