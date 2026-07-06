# Native Google Sign-In Setup Guide

To enable Google Sign-In in your Android app, Google requires a secure handshake between your Android app and your Firebase project. Follow these 3 quick steps to set it up:

---

## 🔑 Step 1: Get Your SHA-1 Key from Android Studio

Google uses a signature fingerprint (SHA-1) to verify that the app login request is coming from your specific laptop.

1. Open your project in Android Studio.
2. In the far right sidebar, click on the **Gradle** tab (or press the double `Ctrl` key and search for `Run Gradle Task`).
3. Click the search/run icon (the play button with Gradle icon) and run the command:
   ```bash
   signingReport
   ```
4. Look at the console output at the bottom. Under `Variant: debugAndroidTest` or `Task :app:signingReport`, you will see:
   * **SHA1**: `XX:XX:XX:XX:XX:XX:XX:XX...`
5. Copy that SHA-1 sequence!

---

## 🌐 Step 2: Add SHA-1 to Your Firebase Console

1. Go to your **[Firebase Console](https://console.firebase.google.com/)**.
2. Select your project (**Star Greetings**).
3. Click the gear icon next to "Project Overview" in the top-left, and select **Project Settings**.
4. Scroll down to the **Your apps** section, and select your Android App (`com.stargreetings.barakatta`).
5. Click **Add fingerprint**.
6. Paste your copied **SHA-1** key, and click **Save**.

---

## 🆔 Step 3: Get Your Web Client ID & Update the App

Google Sign-In needs a "Web Client ID" to authorize requests with Firebase:

1. Inside your Firebase Console, click on **Authentication** in the left sidebar.
2. Go to the **Sign-in method** tab.
3. Click on the **Google** provider to edit it.
4. Expand the **Web SDK configuration** section.
5. You will see a long string labeled **Web client ID** (it looks like `12345678-xxxx.apps.googleusercontent.com`). Copy it!
6. Open **`android/app/src/main/java/com/stargreetings/barakatta/MainActivity.kt`** in your project or Android Studio.
7. Find line **`103`** where it says:
   ```kotlin
   .requestIdToken("YOUR_WEB_CLIENT_ID_HERE")
   ```
8. Replace `"YOUR_WEB_CLIENT_ID_HERE"` with your copied Web Client ID, and save the file.

---

### 🎉 Done!
Now, when you compile and run your APK, clicking **Google** on the login screen will open your phone's built-in account chooser and log you in instantly!
