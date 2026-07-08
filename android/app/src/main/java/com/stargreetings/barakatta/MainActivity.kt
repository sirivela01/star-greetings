package com.stargreetings.barakatta

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
                        webView.evaluateJavascript("javascript:window.handleAndroidGoogleSuccess(\"$idToken\");", null)
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(this, "Google Sign-In failed: No ID Token retrieved.", Toast.LENGTH_LONG).show()
                    }
                    webView.post {
                        webView.evaluateJavascript("javascript:window.handleAndroidGoogleError(\"No ID Token retrieved. Make sure you registered your SHA-1 key in Firebase Console.\");", null)
                    }
                }
            } catch (e: ApiException) {
                val errorMessage = e.message ?: "Error code: ${e.statusCode}"
                runOnUiThread {
                    Toast.makeText(this, "Google Sign-In failed: $errorMessage", Toast.LENGTH_LONG).show()
                }
                webView.post {
                    webView.evaluateJavascript("javascript:window.handleAndroidGoogleError(\"$errorMessage\");", null)
                }
            }
        } else {
            webView.post {
                webView.evaluateJavascript("javascript:window.handleAndroidGoogleError(\"Sign-in cancelled by user\");", null)
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
