import os
import shutil

def create_android_project():
    project_dir = "android"
    
    # Define directories
    dirs = [
        project_dir,
        os.path.join(project_dir, "app"),
        os.path.join(project_dir, "gradle"),
        os.path.join(project_dir, "gradle", "wrapper"),
        os.path.join(project_dir, "app", "src", "main"),
        os.path.join(project_dir, "app", "src", "main", "assets"),
        os.path.join(project_dir, "app", "src", "main", "java", "com", "stargreetings", "barakatta"),
        os.path.join(project_dir, "app", "src", "main", "res"),
        os.path.join(project_dir, "app", "src", "main", "res", "values"),
        os.path.join(project_dir, "app", "src", "main", "res", "mipmap-hdpi"),
        os.path.join(project_dir, "app", "src", "main", "res", "mipmap-mdpi"),
        os.path.join(project_dir, "app", "src", "main", "res", "mipmap-xhdpi"),
        os.path.join(project_dir, "app", "src", "main", "res", "mipmap-xxhdpi"),
        os.path.join(project_dir, "app", "src", "main", "res", "mipmap-xxxhdpi"),
    ]

    for d in dirs:
        if not os.path.exists(d):
            os.makedirs(d)

    # 1. settings.gradle
    settings_gradle = """pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "Star Greetings & Barakatta"
include ':app'
"""
    with open(os.path.join(project_dir, "settings.gradle"), "w", encoding="utf-8") as f:
        f.write(settings_gradle)

    # 2. build.gradle (Project level)
    build_gradle_project = """// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id 'com.android.application' version '8.2.0' apply false
    id 'org.jetbrains.kotlin.android' version '1.9.0' apply false
}
"""
    with open(os.path.join(project_dir, "build.gradle"), "w", encoding="utf-8") as f:
        f.write(build_gradle_project)

    # 3. gradle.properties
    gradle_properties = """org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
org.gradle.java.home=C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr
"""
    with open(os.path.join(project_dir, "gradle.properties"), "w", encoding="utf-8") as f:
        f.write(gradle_properties)

    # 4. app/build.gradle
    build_gradle_app = """plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.stargreetings.barakatta'
    compileSdk 34

    defaultConfig {
        applicationId "com.stargreetings.barakatta"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = '1.8'
    }
}

    dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
}
"""
    with open(os.path.join(project_dir, "app", "build.gradle"), "w", encoding="utf-8") as f:
        f.write(build_gradle_app)

    # 5. AndroidManifest.xml
    manifest = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stargreetings.barakatta">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Star Greetings &amp; Barakatta"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.NoActionBar"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"""
    with open(os.path.join(project_dir, "app", "src", "main", "AndroidManifest.xml"), "w", encoding="utf-8") as f:
        f.write(manifest)

    # 6. MainActivity.kt
    main_activity = """package com.stargreetings.barakatta

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceError
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var googleSignInClient: GoogleSignInClient

    // Native ActivityResult Launcher for Google Sign-In intent
    private val signInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account: GoogleSignInAccount = task.getResult(ApiException::class.java)
                val idToken = account.idToken
                if (idToken != null) {
                    // Send token back to WebView Javascript
                    webView.post {
                        webView.evaluateJavascript("javascript:window.handleAndroidGoogleSuccess(\\"$idToken\\");", null)
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(this, "Google Sign-In failed: No ID Token retrieved.", Toast.LENGTH_LONG).show()
                    }
                    webView.post {
                        webView.evaluateJavascript("javascript:window.handleAndroidGoogleError(\\"No ID Token retrieved. Make sure you registered your SHA-1 key in Firebase Console.\\");", null)
                    }
                }
            } catch (e: ApiException) {
                val errorMessage = e.message ?: "Error code: ${e.statusCode}"
                runOnUiThread {
                    Toast.makeText(this, "Google Sign-In failed: $errorMessage", Toast.LENGTH_LONG).show()
                }
                webView.post {
                    webView.evaluateJavascript("javascript:window.handleAndroidGoogleError(\\"$errorMessage\\");", null)
                }
            }
        } else {
            webView.post {
                webView.evaluateJavascript("javascript:window.handleAndroidGoogleError(\\"Sign-in cancelled by user\\");", null)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_NO_CACHE

        var loadedFallback = false

        webView.webViewClient = object : WebViewClient() {
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String?): Boolean {
                if (url != null) {
                    view.loadUrl(url)
                }
                return true
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true && !loadedFallback) {
                    loadedFallback = true
                    runOnUiThread {
                        view?.loadUrl("file:///android_asset/www/index.html")
                        Toast.makeText(this@MainActivity, "Offline: Loaded local game files", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        webView.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onJsAlert(
                view: WebView?,
                url: String?,
                message: String?,
                result: android.webkit.JsResult?
            ): Boolean {
                runOnUiThread {
                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
                        .setCancelable(false)
                        .show()
                }
                return true
            }
        }

        // Configure Google Sign-In options
        // NOTE: Replace "YOUR_WEB_CLIENT_ID_HERE" with your actual Web Client ID from Firebase Console (Project Settings > Web SDK config)
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken("486760097374-2cq854f89jq0kbirvqfnbtjd77cpena4.apps.googleusercontent.com")
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        // Register Javascript Bridge Interface
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        // Load development server IP first, falls back to offline assets automatically if unreachable
        webView.loadUrl("http://192.168.0.214:8000/index.html")
    }

    // Inner class defining JavaScript interface methods
    inner class WebAppInterface {
        @JavascriptInterface
        fun loginWithGoogle() {
            runOnUiThread {
                // Sign out first to force account selector popup
                googleSignInClient.signOut().addOnCompleteListener {
                    val signInIntent = googleSignInClient.signInIntent
                    signInLauncher.launch(signInIntent)
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
"""
    with open(os.path.join(project_dir, "app", "src", "main", "java", "com", "stargreetings", "barakatta", "MainActivity.kt"), "w", encoding="utf-8") as f:
        f.write(main_activity)

    # 7. strings.xml
    strings = """<resources>
    <string name="app_name">Star Greetings &amp; Barakatta</string>
</resources>
"""
    with open(os.path.join(project_dir, "app", "src", "main", "res", "values", "strings.xml"), "w", encoding="utf-8") as f:
        f.write(strings)

    # 8. themes.xml
    themes = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.AppCompat.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">#06b6d4</item>
        <item name="colorPrimaryDark">#0891b2</item>
        <item name="colorAccent">#ec4899</item>
        <item name="android:statusBarColor">#0f172a</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
"""
    with open(os.path.join(project_dir, "app", "src", "main", "res", "values", "themes.xml"), "w", encoding="utf-8") as f:
        f.write(themes)

    # 9. Copy game assets
    assets_dest = os.path.join(project_dir, "app", "src", "main", "assets", "www")
    if os.path.exists(assets_dest):
        shutil.rmtree(assets_dest)
    
    print("Copying game files to Android assets...")
    shutil.copytree("www", assets_dest)

    # 10. Copy Logo source
    logo_src = "app_game_logo_letters_1783346742441.png"
    if os.path.exists(logo_src):
        shutil.copy(logo_src, os.path.join(project_dir, "icon.png"))
        print("Launcher logo source copied to android/icon.png")

    print("\n[OK] Native Android Studio Project generated successfully in 'android/' folder!")

if __name__ == "__main__":
    create_android_project()
