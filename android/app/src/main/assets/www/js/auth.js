// Star Greetings - User Authentication & Dashboard Logic

// Helper to compress image client-side to a max 1024px size, keeping original aspect ratio and high quality
function compressImage(file, maxDimension, quality, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions keeping aspect ratio
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG at high quality
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      callback(compressedDataUrl);
    };
  };
}

class AuthManager {
  constructor() {
    this.accountsKey = "star_greetings_accounts";
    this.sessionKey = "star_greetings_session";
    this.rememberKey = "star_greetings_remembered";
    
    // Initialize default mock account if none exists
    if (!localStorage.getItem(this.accountsKey)) {
      const defaultAccounts = {
        "allu": { name: "Allu", password: "123", coins: 300, freeStackBuys: 10 }
      };
      localStorage.setItem(this.accountsKey, JSON.stringify(defaultAccounts));
    }
  }

  getAccounts() {
    return JSON.parse(localStorage.getItem(this.accountsKey)) || {};
  }

  saveAccounts(accounts) {
    localStorage.setItem(this.accountsKey, JSON.stringify(accounts));
  }

  async signup(name, username, password) {
    const accounts = this.getAccounts();
    const normalizedUsername = username.trim().toLowerCase();
    
    if (accounts[normalizedUsername]) {
      return { error: "Username already exists!" };
    }

    let uid = null;
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const email = `${normalizedUsername}@stargreetings.com`;
      try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        uid = userCredential.user.uid;
        
        // Write profile details to database `/users/{uid}`
        await firebase.database().ref(`users/${uid}`).set({
          name: name.trim(),
          username: normalizedUsername,
          coins: 300,
          freeStackBuys: 10
        });

        // Initialize Greetings Stack to 6 under players/{uid}
        await firebase.database().ref(`players/${uid}`).set({
          greetingsStack: 6
        });
      } catch (err) {
        console.error("Firebase signup error:", err);
        return { error: "Firebase registration failed: " + err.message };
      }
    }

    accounts[normalizedUsername] = {
      name: name.trim(),
      password: password,
      coins: 300,
      freeStackBuys: 10,
      greetingsStack: 6,
      uid: uid
    };

    this.saveAccounts(accounts);
    return { success: true };
  }

  async login(username, password, rememberMe) {
    const accounts = this.getAccounts();
    const normalizedUsername = username.trim().toLowerCase();
    const localUser = accounts[normalizedUsername];

    let fbUser = null;
    let uid = null;
    let greetingsStack = 6;
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const email = `${normalizedUsername}@stargreetings.com`;
      try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        uid = userCredential.user.uid;
        
        // Fetch profile details from `/users/{uid}`
        const snapshot = await firebase.database().ref(`users/${uid}`).once("value");
        if (snapshot.exists()) {
          fbUser = snapshot.val();
        } else {
          fbUser = {
            name: localUser ? localUser.name : username,
            username: normalizedUsername,
            coins: localUser ? localUser.coins : 300,
            freeStackBuys: localUser ? localUser.freeStackBuys : 10
          };
          await firebase.database().ref(`users/${uid}`).set(fbUser);
        }

        // Fetch Greetings Stack from `/players/{uid}`
        const playerSnapshot = await firebase.database().ref(`players/${uid}`).once("value");
        if (playerSnapshot.exists()) {
          const val = playerSnapshot.val();
          greetingsStack = (val && val.greetingsStack !== undefined) ? val.greetingsStack : 6;
        } else {
          await firebase.database().ref(`players/${uid}`).set({ greetingsStack: 6 });
          greetingsStack = 6;
        }
      } catch (err) {
        console.error("Firebase login error:", err);
        if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
          return { error: "Invalid username or password!" };
        }
        if (!localUser) {
          return { error: "Firebase login failed: " + err.message };
        }
      }
    }

    let userToUse = localUser;
    if (fbUser) {
      userToUse = {
        name: fbUser.name,
        password: password,
        coins: isNaN(parseInt(fbUser.coins, 10)) ? 300 : parseInt(fbUser.coins, 10),
        freeStackBuys: isNaN(parseInt(fbUser.freeStackBuys, 10)) ? 10 : parseInt(fbUser.freeStackBuys, 10),
        greetingsStack: greetingsStack,
        uid: uid,
        avatar: fbUser.avatar || ""
      };
      accounts[normalizedUsername] = userToUse;
      this.saveAccounts(accounts);
    } else {
      if (!localUser || localUser.password !== password) {
        return { error: "Invalid username or password!" };
      }
      if (localUser.greetingsStack === undefined) {
        localUser.greetingsStack = 6;
        accounts[normalizedUsername] = localUser;
        this.saveAccounts(accounts);
      }
    }

    localStorage.setItem(this.sessionKey, normalizedUsername);

    if (rememberMe) {
      localStorage.setItem(this.rememberKey, JSON.stringify({ username: normalizedUsername, password }));
    } else {
      localStorage.removeItem(this.rememberKey);
    }

    return { success: true, user: userToUse };
  }

  async resetPassword(username, newPassword) {
    const accounts = this.getAccounts();
    const normalizedUsername = username.trim().toLowerCase();
    const localUser = accounts[normalizedUsername];

    if (!localUser) {
      return { error: "Username not found!" };
    }

    const oldPassword = localUser.password;

    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      const email = `${normalizedUsername}@stargreetings.com`;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, oldPassword);
        if (firebase.auth().currentUser) {
          await firebase.auth().currentUser.updatePassword(newPassword);
        }
      } catch (err) {
        console.error("Firebase password update failed:", err);
        return { error: "Failed to update password on Firebase: " + err.message };
      }
    }

    localUser.password = newPassword;
    this.saveAccounts(accounts);
    return { success: true };
  }

  logout() {
    localStorage.removeItem(this.sessionKey);
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      try {
        firebase.auth().signOut().catch(err => console.error("Firebase signOut error:", err));
      } catch (err) {
        console.warn("Firebase signOut failed synchronously:", err);
      }
    }
  }

  async updateCoins(coins) {
    const localUser = this.getCurrentUser();
    if (!localUser) return { error: "No logged in user" };

    const accounts = this.getAccounts();
    const normalizedUsername = localUser.username.trim().toLowerCase();
    if (accounts[normalizedUsername]) {
      accounts[normalizedUsername].coins = coins;
      this.saveAccounts(accounts);
    }

    if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && localUser.uid) {
      try {
        await firebase.database().ref(`users/${localUser.uid}`).update({
          coins: coins
        });
      } catch (err) {
        console.error("Firebase coins update failed:", err);
        return { error: "Failed to update coins on Firebase: " + err.message };
      }
    }
    return { success: true };
  }

  async updateGreetingsStackLocal(count) {
    const localUser = this.getCurrentUser();
    if (!localUser) return { error: "No logged in user" };

    const accounts = this.getAccounts();
    const normalizedUsername = localUser.username.trim().toLowerCase();
    if (accounts[normalizedUsername]) {
      accounts[normalizedUsername].greetingsStack = count;
      this.saveAccounts(accounts);
    }
    return { success: true };
  }

  getCurrentUser() {
    const username = localStorage.getItem(this.sessionKey);
    if (!username) return null;
    
    const accounts = this.getAccounts();
    const user = accounts[username];
    if (user) {
      user.username = username;
    }
    return user;
  }

  getRememberedDetails() {
    const data = localStorage.getItem(this.rememberKey);
    return data ? JSON.parse(data) : null;
  }

  async loginWithProvider(providerName) {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
      return { error: "Firebase is not loaded or configured!" };
    }

    let provider;
    if (providerName === 'google') {
      provider = new firebase.auth.GoogleAuthProvider();
    } else if (providerName === 'facebook') {
      provider = new firebase.auth.FacebookAuthProvider();
    } else {
      return { error: "Unsupported social provider: " + providerName };
    }

    try {
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (!user) {
        return { error: "No user returned from popup login." };
      }

      let baseUsername = (user.email ? user.email.split('@')[0] : user.displayName || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      
      if (!baseUsername) {
        baseUsername = 'user' + user.uid.substring(0, 5);
      }
      
      const snapshot = await firebase.database().ref(`users/${user.uid}`).once("value");
      let dbUser;
      let greetingsStack = 6;
      
      if (snapshot.exists()) {
        dbUser = snapshot.val();
        const playerSnapshot = await firebase.database().ref(`players/${user.uid}`).once("value");
        if (playerSnapshot.exists()) {
          const val = playerSnapshot.val();
          greetingsStack = (val && val.greetingsStack !== undefined) ? val.greetingsStack : 6;
        } else {
          await firebase.database().ref(`players/${user.uid}`).set({ greetingsStack: 6 });
          greetingsStack = 6;
        }
      } else {
        dbUser = {
          name: user.displayName || baseUsername,
          username: baseUsername,
          coins: 300,
          freeStackBuys: 10,
          uid: user.uid,
          avatar: user.photoURL || ""
        };
        await firebase.database().ref(`users/${user.uid}`).set(dbUser);
        await firebase.database().ref(`players/${user.uid}`).set({ greetingsStack: 6 });
        greetingsStack = 6;
      }

      const accounts = this.getAccounts();
      const finalUsername = dbUser.username || baseUsername;
      
      accounts[finalUsername] = {
        name: dbUser.name,
        password: "",
        coins: isNaN(parseInt(dbUser.coins, 10)) ? 300 : parseInt(dbUser.coins, 10),
        freeStackBuys: isNaN(parseInt(dbUser.freeStackBuys, 10)) ? 10 : parseInt(dbUser.freeStackBuys, 10),
        greetingsStack: greetingsStack,
        uid: user.uid,
        social: providerName,
        avatar: dbUser.avatar || user.photoURL || ""
      };
      
      this.saveAccounts(accounts);
      localStorage.setItem(this.sessionKey, finalUsername);

      return { success: true, user: accounts[finalUsername] };
    } catch (err) {
      console.error("Social login popup error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        return { error: "Login popup was closed before completion." };
      }
      if (err.code === "auth/blocked-by-popup-killer") {
        return { error: "Popups are blocked by your browser. Please allow popups for this site." };
      }
      return { error: err.message };
    }
  }

  async updateAvatar(avatarDataUrl) {
    const localUser = this.getCurrentUser();
    if (!localUser) return { error: "No logged in user" };

    const accounts = this.getAccounts();
    const normalizedUsername = localUser.username.trim().toLowerCase();
    if (accounts[normalizedUsername]) {
      accounts[normalizedUsername].avatar = avatarDataUrl;
      this.saveAccounts(accounts);
    }

    if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && localUser.uid) {
      try {
        await firebase.database().ref(`users/${localUser.uid}`).update({
          avatar: avatarDataUrl
        });
      } catch (err) {
        console.error("Firebase avatar update failed:", err);
        return { error: "Failed to update avatar on Firebase: " + err.message };
      }
    }
    return { success: true };
  }
}

// Global Auth Manager Instance
const auth = new AuthManager();

// --- DOM Page Navigation & View Transitions ---
document.addEventListener("DOMContentLoaded", () => {
  // Check if we are running in an Android WebView context
  const isWebView = window.location.protocol === 'file:' || navigator.userAgent.toLowerCase().includes('wv');
  if (isWebView) {
    // Hide Facebook login button (popups are unsupported and we aren't using a native Facebook SDK)
    const facebookBtnEl = document.getElementById("facebook-login-btn");
    if (facebookBtnEl) {
      facebookBtnEl.style.display = "none";
    }
    // Make Google button take full width
    const googleBtnEl = document.getElementById("google-login-btn");
    if (googleBtnEl) {
      googleBtnEl.style.flex = "1";
      googleBtnEl.style.width = "100%";
    }
  }

  const loginView = document.getElementById("login-screen");
  const signupView = document.getElementById("signup-screen");
  const forgotView = document.getElementById("forgot-password-screen");
  const dashboardView = document.getElementById("dashboard-screen");
  const setupView = document.getElementById("setup-screen");
  const gameView = document.getElementById("game-screen");

  // Inputs & forms
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const forgotForm = document.getElementById("forgot-form");
  
  // Dashboard profile elements
  const profileNameLabel = document.getElementById("dashboard-profile-name");
  const profileCoinsLabel = document.getElementById("dashboard-profile-coins");

  // Navigation Links
  const toSignupBtn = document.getElementById("link-to-signup");
  const toLoginBtn = document.getElementById("link-to-login");
  const toForgotBtn = document.getElementById("link-to-forgot");
  const forgotToLoginBtn = document.getElementById("link-forgot-to-login");
  
  // Action Buttons
  const logoutBtn = document.getElementById("dashboard-logout-btn");
  const playOfflineBtn = document.getElementById("play-offline-btn");
  const playAiBtn = document.getElementById("play-ai-btn");

  // Helper to hide all main views (including Barakatta screens)
  function hideAllViews() {
    const allViews = [
      loginView, signupView, forgotView, dashboardView, setupView, gameView,
      document.getElementById("game-selection-screen"),
      document.getElementById("barakatta-dashboard-screen"),
      document.getElementById("barakatta-setup-screen"),
      document.getElementById("barakatta-game-screen")
    ];
    allViews.forEach(view => {
      if (view) view.classList.add("hidden");
    });
  }

  // Password Visibility Toggles
  document.querySelectorAll(".password-input-wrapper").forEach(wrapper => {
    const input = wrapper.querySelector("input");
    const btn = wrapper.querySelector(".toggle-password-btn");
    if (input && btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        
        const openIcon = btn.querySelector(".eye-icon-open");
        const closedIcon = btn.querySelector(".eye-icon-closed");
        if (openIcon && closedIcon) {
          if (isPassword) {
            openIcon.classList.add("hidden");
            closedIcon.classList.remove("hidden");
          } else {
            openIcon.classList.remove("hidden");
            closedIcon.classList.add("hidden");
          }
        }
      });
    }
  });

  // Render profile dashboard data
  function showDashboard(user) {
    hideAllViews();
    dashboardView.classList.remove("hidden");
    profileNameLabel.textContent = user.name;
    profileCoinsLabel.textContent = user.coins;

    const profileAvatar = document.getElementById("dashboard-profile-avatar");
    const avatarEmoji = document.getElementById("dashboard-avatar-emoji");
    if (profileAvatar && avatarEmoji) {
      if (user.avatar) {
        profileAvatar.src = user.avatar;
        profileAvatar.classList.remove("hidden");
        avatarEmoji.classList.add("hidden");
      } else {
        profileAvatar.src = "";
        profileAvatar.classList.add("hidden");
        avatarEmoji.classList.remove("hidden");
      }
    }
    
    // Refresh greetings stack UI and local storage cache
    if (window.refreshGreetingsStack) {
      window.refreshGreetingsStack(user);
    }
  }

  // Initialize login form defaults (remember me)
  function initLoginForm() {
    const remembered = auth.getRememberedDetails();
    if (remembered) {
      document.getElementById("login-username").value = remembered.username;
      document.getElementById("login-password").value = remembered.password;
      document.getElementById("login-remember").checked = true;
    } else {
      document.getElementById("login-username").value = "";
      document.getElementById("login-password").value = "";
      document.getElementById("login-remember").checked = false;
    }
  }

  // Handle cold start splash screen fade out
  const splashStartTime = Date.now();
  let splashResolved = false;
  function resolveSplash() {
    if (splashResolved) return;
    const elapsed = Date.now() - splashStartTime;
    const minDuration = 7000; // 7 seconds
    if (elapsed < minDuration) {
      setTimeout(resolveSplash, minDuration - elapsed);
      return;
    }
    splashResolved = true;
    const splash = document.getElementById("cold-start-splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 500);
    }
  }

  // Set a fallback timeout for the splash screen in case we are offline or Firebase is slow
  setTimeout(resolveSplash, 7000);

  // Initialize Firebase Auth state change listener
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    try {
      firebase.auth().onAuthStateChanged((fbUser) => {
        const currentUser = auth.getCurrentUser();
        if (fbUser) {
          // Firebase user is authenticated
          if (currentUser) {
            // Sync local storage coins and avatar if they mismatch
            firebase.database().ref(`users/${fbUser.uid}`).once("value").then(snapshot => {
              if (snapshot.exists()) {
                const data = snapshot.val();
                const accounts = auth.getAccounts();
                if (accounts[currentUser.username]) {
                  accounts[currentUser.username].coins = isNaN(parseInt(data.coins, 10)) ? 300 : parseInt(data.coins, 10);
                  accounts[currentUser.username].freeStackBuys = isNaN(parseInt(data.freeStackBuys, 10)) ? 10 : parseInt(data.freeStackBuys, 10);
                  accounts[currentUser.username].uid = fbUser.uid;
                  accounts[currentUser.username].avatar = data.avatar || fbUser.photoURL || "";
                  auth.saveAccounts(accounts);
                  
                  // Refresh dashboard if visible
                  if (!dashboardView.classList.contains("hidden")) {
                    showDashboard(auth.getCurrentUser());
                  }
                }
              }
            }).catch(err => console.error("Error syncing user data:", err));
            showGameSelection(currentUser);
          } else {
            // Firebase authenticated but no local session? Sign out to stay in sync.
            try {
              firebase.auth().signOut().catch(err => console.error(err));
            } catch (signOutErr) {
              console.warn("Sign out failed:", signOutErr);
            }
            hideAllViews();
            loginView.classList.remove("hidden");
            initLoginForm();
          }
        } else {
          // Firebase user is not authenticated
          if (currentUser) {
            // We have a local session. Let them stay logged in locally for offline play.
            showGameSelection(currentUser);
          } else {
            hideAllViews();
            loginView.classList.remove("hidden");
            initLoginForm();
          }
        }
        resolveSplash();
      });
    } catch (authInitErr) {
      console.warn("Firebase Auth state listener initialization failed:", authInitErr);
      // Fallback: resolve splash screen with local session
      const currentUser = auth.getCurrentUser();
      if (currentUser) {
        showGameSelection(currentUser);
      } else {
        hideAllViews();
        loginView.classList.remove("hidden");
        initLoginForm();
      }
      resolveSplash();
    }
  } else {
    // No Firebase loaded, resolve splash immediately
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      showGameSelection(currentUser);
    } else {
      hideAllViews();
      loginView.classList.remove("hidden");
      initLoginForm();
    }
    resolveSplash();
  }

  // --- BUTTON CLICKS & TRIGGERS ---

  // Social Login Button Clicks
  const googleBtn = document.getElementById("google-login-btn");
  const facebookBtn = document.getElementById("facebook-login-btn");

  const handleSocialLogin = async (btn, provider) => {
    const originalContent = btn.innerHTML;
    btn.classList.add("loading");
    btn.setAttribute("disabled", "true");
    
    try {
      const res = await auth.loginWithProvider(provider);
      if (res.success) {
        showGameSelection(res.user);
      } else {
        alert(res.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Login failed: " + err.message);
    } finally {
      btn.innerHTML = originalContent;
      btn.classList.remove("loading");
      btn.removeAttribute("disabled");
    }
  };

  if (googleBtn) {
    googleBtn.addEventListener("click", () => {
      const isWebView = window.location.protocol === 'file:' || navigator.userAgent.toLowerCase().includes('wv');
      if (isWebView && typeof AndroidBridge !== 'undefined') {
        // Trigger native Google sign-in wrapper in Android
        AndroidBridge.loginWithGoogle();
      } else {
        // Fallback to web popup sign-in
        handleSocialLogin(googleBtn, "google");
      }
    });
  }
  if (facebookBtn) {
    facebookBtn.addEventListener("click", () => handleSocialLogin(facebookBtn, "facebook"));
  }

  // Global callbacks for Native Google Sign-In integration
  window.handleAndroidGoogleSuccess = async (idToken) => {
    if (!googleBtn) return;
    const originalContent = googleBtn.innerHTML;
    googleBtn.innerHTML = "Logging in...";
    googleBtn.classList.add("loading");
    googleBtn.setAttribute("disabled", "true");

    try {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
        const result = await firebase.auth().signInWithCredential(credential);
        const user = result.user;

        if (user) {
          let baseUsername = (user.email ? user.email.split('@')[0] : user.displayName || 'user')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          
          if (!baseUsername) {
            baseUsername = 'user' + user.uid.substring(0, 5);
          }

          const snapshot = await firebase.database().ref(`users/${user.uid}`).once("value");
          let dbUser;
          let greetingsStack = 6;

          if (snapshot.exists()) {
            dbUser = snapshot.val();
            const playerSnapshot = await firebase.database().ref(`players/${user.uid}`).once("value");
            if (playerSnapshot.exists()) {
              const val = playerSnapshot.val();
              greetingsStack = (val && val.greetingsStack !== undefined) ? val.greetingsStack : 6;
            } else {
              await firebase.database().ref(`players/${user.uid}`).set({ greetingsStack: 6 });
              greetingsStack = 6;
            }
          } else {
            dbUser = {
              name: user.displayName || baseUsername,
              username: baseUsername,
              coins: 300,
              freeStackBuys: 10,
              uid: user.uid,
              avatar: user.photoURL || ""
            };
            await firebase.database().ref(`users/${user.uid}`).set(dbUser);
            await firebase.database().ref(`players/${user.uid}`).set({ greetingsStack: 6 });
            greetingsStack = 6;
          }

          const accounts = auth.getAccounts();
          const finalUsername = dbUser.username || baseUsername;

          accounts[finalUsername] = {
            name: dbUser.name,
            password: "",
            coins: isNaN(parseInt(dbUser.coins, 10)) ? 300 : parseInt(dbUser.coins, 10),
            freeStackBuys: isNaN(parseInt(dbUser.freeStackBuys, 10)) ? 10 : parseInt(dbUser.freeStackBuys, 10),
            greetingsStack: greetingsStack,
            uid: user.uid,
            social: "google",
            avatar: dbUser.avatar || user.photoURL || ""
          };

          auth.saveAccounts(accounts);
          localStorage.setItem(auth.sessionKey, finalUsername);

          showGameSelection(accounts[finalUsername]);
        } else {
          alert("Login failed: Google user could not be retrieved.");
        }
      }
    } catch (err) {
      console.error("Firebase Auth with Google credential failed:", err);
      alert("Google Sign-In failed: " + err.message);
    } finally {
      googleBtn.innerHTML = originalContent;
      googleBtn.classList.remove("loading");
      googleBtn.removeAttribute("disabled");
    }
  };

  window.handleAndroidGoogleError = (errorMessage) => {
    alert("Google Sign-In failed: " + errorMessage);
  };

  // Go to Sign Up
  if (toSignupBtn) {
    toSignupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      signupView.classList.remove("hidden");
      signupForm.reset();
    });
  }

  // Go to Login from Sign Up
  if (toLoginBtn) {
    toLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      loginView.classList.remove("hidden");
      initLoginForm();
    });
  }

  // Go to Forgot Password
  if (toForgotBtn) {
    toForgotBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      forgotView.classList.remove("hidden");
      forgotForm.reset();
    });
  }

  // Go to Login from Forgot Password
  if (forgotToLoginBtn) {
    forgotToLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllViews();
      loginView.classList.remove("hidden");
      initLoginForm();
    });
  }

  // Logout Click
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.logout();
      hideAllViews();
      loginView.classList.remove("hidden");
      initLoginForm();
    });
  }

  // Play Offline Click
  if (playOfflineBtn) {
    playOfflineBtn.addEventListener("click", () => {
      hideAllViews();
      const themeSelectionView = document.getElementById("theme-selection-screen");
      if (themeSelectionView) {
        themeSelectionView.classList.remove("hidden");
      }
      window.themeSelectMode = "offline";
      const diffContainer = document.getElementById("ai-difficulty-container");
      if (diffContainer) diffContainer.style.display = "none";
    });
  }

  // Play AI Click
  if (playAiBtn) {
    playAiBtn.addEventListener("click", () => {
      hideAllViews();
      const themeSelectionView = document.getElementById("theme-selection-screen");
      if (themeSelectionView) {
        themeSelectionView.classList.remove("hidden");
      }
      window.themeSelectMode = "ai_bot";
      const diffContainer = document.getElementById("ai-difficulty-container");
      if (diffContainer) diffContainer.style.display = "block";
    });
  }

  // --- FORM SUBMISSIONS ---

  // Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userVal = document.getElementById("login-username").value.trim();
      const passVal = document.getElementById("login-password").value;
      const rememberVal = document.getElementById("login-remember").checked;

      if (!userVal || !passVal) {
        alert("Please enter both username and password.");
        return;
      }

      const submitBtn = loginForm.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Logging in...";
      submitBtn.setAttribute("disabled", "true");

      try {
        const res = await auth.login(userVal, passVal, rememberVal);
        if (res.success) {
          showGameSelection(res.user);
        } else {
          alert(res.error);
        }
      } catch (err) {
        alert("An error occurred: " + err.message);
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.removeAttribute("disabled");
      }
    });
  }

  // Handle Sign Up Form Submit
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById("signup-name").value.trim();
      const userVal = document.getElementById("signup-username").value.trim();
      const passVal = document.getElementById("signup-password").value;

      if (!nameVal || !userVal || !passVal) {
        alert("Please fill in all details.");
        return;
      }

      if (userVal.length < 3) {
        alert("Username must be at least 3 characters long.");
        return;
      }

      if (passVal.length < 3) {
        alert("Password must be at least 3 characters long.");
        return;
      }

      const submitBtn = signupForm.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Creating Account...";
      submitBtn.setAttribute("disabled", "true");

      try {
        const res = await auth.signup(nameVal, userVal, passVal);
        if (res.success) {
          alert("Account created successfully! Please log in.");
          hideAllViews();
          loginView.classList.remove("hidden");
          initLoginForm();
          document.getElementById("login-username").value = userVal;
        } else {
          alert(res.error);
        }
      } catch (err) {
        alert("An error occurred: " + err.message);
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.removeAttribute("disabled");
      }
    });
  }

  // Handle Forgot Password Form Submit
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userVal = document.getElementById("forgot-username").value.trim();
      const passVal = document.getElementById("forgot-new-password").value;
      const confirmVal = document.getElementById("forgot-confirm-password").value;

      if (!userVal || !passVal || !confirmVal) {
        alert("Please fill in all details.");
        return;
      }

      if (passVal !== confirmVal) {
        alert("Passwords do not match!");
        return;
      }

      if (passVal.length < 3) {
        alert("Password must be at least 3 characters long.");
        return;
      }

      const submitBtn = forgotForm.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Resetting...";
      submitBtn.setAttribute("disabled", "true");

      try {
        const res = await auth.resetPassword(userVal, passVal);
        if (res.success) {
          alert("Password updated successfully! Log in with your new password.");
          hideAllViews();
          loginView.classList.remove("hidden");
          initLoginForm();
          document.getElementById("login-username").value = userVal;
        } else {
          alert(res.error);
        }
      } catch (err) {
        alert("An error occurred: " + err.message);
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.removeAttribute("disabled");
      }
    });
  }

  // Dashboard Avatar Change Event Listeners
  const avatarContainer = document.getElementById("dashboard-avatar-container");
  const avatarFileInput = document.getElementById("avatar-file-input");

  // Profile Photo Modal Elements
  const avatarModal = document.getElementById("profile-avatar-modal");
  const avatarModalImg = document.getElementById("profile-avatar-modal-img");
  const avatarModalEmoji = document.getElementById("profile-avatar-modal-emoji");
  const avatarModalCloseX = document.getElementById("profile-avatar-close-x");
  const avatarModalViewBtn = document.getElementById("profile-avatar-view-btn");
  const avatarModalChangeBtn = document.getElementById("profile-avatar-change-btn");

  // Lightbox Elements
  const lightbox = document.getElementById("full-photo-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  function openAvatarModal() {
    if (!avatarModal) return;
    const currentUser = auth.getCurrentUser();
    if (!currentUser) return;

    if (currentUser.avatar) {
      if (avatarModalImg) {
        avatarModalImg.src = currentUser.avatar;
        avatarModalImg.style.display = "block";
      }
      if (avatarModalEmoji) {
        avatarModalEmoji.style.display = "none";
      }
    } else {
      if (avatarModalImg) {
        avatarModalImg.src = "";
        avatarModalImg.style.display = "none";
      }
      if (avatarModalEmoji) {
        avatarModalEmoji.style.display = "block";
      }
    }

    avatarModal.classList.remove("hidden");
    avatarModal.style.display = "flex";
  }

  function closeAvatarModal() {
    if (avatarModal) {
      avatarModal.classList.add("hidden");
      avatarModal.style.display = "none";
    }
  }

  if (avatarContainer) {
    avatarContainer.addEventListener("click", () => {
      openAvatarModal();
    });
  }

  if (avatarModalCloseX) {
    avatarModalCloseX.addEventListener("click", closeAvatarModal);
  }
  if (avatarModalViewBtn) {
    avatarModalViewBtn.addEventListener("click", () => {
      const currentUser = auth.getCurrentUser();
      if (currentUser && currentUser.avatar && lightbox && lightboxImg) {
        lightboxImg.src = currentUser.avatar;
        lightbox.classList.remove("hidden");
        lightbox.style.display = "flex";
      } else {
        alert("You do not have a custom profile picture set yet.");
      }
    });
  }

  // Dismiss lightbox on click
  if (lightbox) {
    lightbox.addEventListener("click", () => {
      lightbox.classList.add("hidden");
      lightbox.style.display = "none";
    });
  }

  if (avatarModalChangeBtn && avatarFileInput) {
    avatarModalChangeBtn.addEventListener("click", () => {
      avatarFileInput.click();
    });
  }

  if (avatarFileInput) {
    avatarFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
      }

      if (avatarContainer) avatarContainer.style.opacity = "0.5";
      if (avatarModal) avatarModal.style.opacity = "0.5";

      compressImage(file, 1024, 0.85, async (compressedDataUrl) => {
        const res = await auth.updateAvatar(compressedDataUrl);
        if (avatarContainer) avatarContainer.style.opacity = "1";
        if (avatarModal) avatarModal.style.opacity = "1";
        
        if (res.success) {
          const currentUser = auth.getCurrentUser();
          if (currentUser) {
            if (window.selectedGame === "barakatta") {
              showBarakattaDashboard(currentUser);
            } else {
              showDashboard(currentUser);
            }
            // Also update the modal preview image instantly
            if (avatarModalImg) {
              avatarModalImg.src = compressedDataUrl;
              avatarModalImg.style.display = "block";
            }
            if (avatarModalEmoji) {
              avatarModalEmoji.style.display = "none";
            }
          }
        } else {
          alert(res.error || "Failed to update avatar");
        }
      });
    });
  }

  // --- Barakatta & Game Selection Screen Helper Functions ---
  function showGameSelection(user) {
    hideAllViews();
    const selectionView = document.getElementById("game-selection-screen");
    if (selectionView) {
      selectionView.classList.remove("hidden");
    }
    window.currentUser = user;
  }

  function showBarakattaDashboard(user) {
    hideAllViews();
    const bkDashboardView = document.getElementById("barakatta-dashboard-screen");
    if (bkDashboardView) {
      bkDashboardView.classList.remove("hidden");
    }
    
    document.getElementById("bk-dashboard-profile-name").textContent = user.name;
    document.getElementById("bk-dashboard-profile-coins").textContent = user.coins;

    const profileAvatar = document.getElementById("bk-dashboard-profile-avatar");
    const avatarEmoji = document.getElementById("bk-dashboard-avatar-emoji");
    if (profileAvatar && avatarEmoji) {
      if (user.avatar) {
        profileAvatar.src = user.avatar;
        profileAvatar.classList.remove("hidden");
        avatarEmoji.classList.add("hidden");
      } else {
        profileAvatar.src = "";
        profileAvatar.classList.add("hidden");
        avatarEmoji.classList.remove("hidden");
      }
    }

    loadBarakattaStats(user);
  }

  // Expose to window so Barakatta setup/game screens can navigate back
  window.showBarakattaDashboard = showBarakattaDashboard;

  function loadBarakattaStats(user) {
    const winsLabel = document.getElementById("barakatta-stats-wins");
    if (!winsLabel) return;
    
    winsLabel.textContent = "...";

    if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && user.uid) {
      firebase.database().ref(`barakatta/userStats/${user.uid}/barakattaWins`).once("value")
        .then(snapshot => {
          const wins = snapshot.exists() ? snapshot.val() : 0;
          winsLabel.textContent = wins;
        })
        .catch(err => {
          console.warn("Failed to load Barakatta stats from Firebase:", err);
          const localStats = JSON.parse(localStorage.getItem("bk_stats_" + user.username)) || { wins: 0 };
          winsLabel.textContent = localStats.wins;
        });
    } else {
      const localStats = JSON.parse(localStorage.getItem("bk_stats_" + user.username)) || { wins: 0 };
      winsLabel.textContent = localStats.wins;
    }
  }

  // Selection Card Click Events
  const selectStarGreetingsBtn = document.getElementById("select-star-greetings-btn");
  if (selectStarGreetingsBtn) {
    selectStarGreetingsBtn.addEventListener("click", () => {
      window.selectedGame = "star_greetings";
      showDashboard(window.currentUser);
    });
  }

  const selectBarakattaBtn = document.getElementById("select-barakatta-btn");
  if (selectBarakattaBtn) {
    selectBarakattaBtn.addEventListener("click", () => {
      window.selectedGame = "barakatta";
      showBarakattaDashboard(window.currentUser);
    });
  }

  // Barakatta Dashboard controls
  const bkDashboardBackBtn = document.getElementById("barakatta-dashboard-back-btn");
  if (bkDashboardBackBtn) {
    bkDashboardBackBtn.addEventListener("click", () => {
      showGameSelection(window.currentUser);
    });
  }

  const bkPlayAiBtn = document.getElementById("barakatta-play-ai-btn");
  if (bkPlayAiBtn) {
    bkPlayAiBtn.addEventListener("click", () => {
      if (window.startBarakattaGame) {
        window.startBarakattaGame("ai_bot");
      } else {
        alert("Barakatta game logic not loaded yet!");
      }
    });
  }

  const bkPlayOfflineBtn = document.getElementById("barakatta-play-offline-btn");
  if (bkPlayOfflineBtn) {
    bkPlayOfflineBtn.addEventListener("click", () => {
      if (window.startBarakattaGame) {
        window.startBarakattaGame("offline");
      } else {
        alert("Barakatta game logic not loaded yet!");
      }
    });
  }

  const bkExitGameBtn = document.getElementById("bk-exit-game-btn");
  if (bkExitGameBtn) {
    bkExitGameBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to exit the match? Progress will be lost.")) {
        showBarakattaDashboard(window.currentUser);
      }
    });
  }

  const bkRulesBtn = document.getElementById("bk-rules-btn");
  const bkRulesModal = document.getElementById("bk-rules-modal");
  const bkRulesCloseBtn = document.getElementById("bk-rules-close-btn");

  if (bkRulesBtn && bkRulesModal) {
    bkRulesBtn.addEventListener("click", () => {
      bkRulesModal.classList.remove("hidden");
      bkRulesModal.style.display = "flex";
    });
  }
  if (bkRulesCloseBtn && bkRulesModal) {
    bkRulesCloseBtn.addEventListener("click", () => {
      bkRulesModal.classList.add("hidden");
      bkRulesModal.style.display = "none";
    });
  }
});

// Global helper to refresh the greetings stack UI count and warning state
window.refreshGreetingsStack = async function(user) {
  if (!user) return;
  const dbUrl = (window.multiplayer && window.multiplayer.firebaseConfig) 
    ? window.multiplayer.firebaseConfig.databaseURL 
    : "";
  const userId = user.uid || user.username;
  const greetingsCountEl = document.getElementById("dashboard-greetings-count");
  const greetingsWrapper = document.getElementById("dashboard-greetings-wrapper");
  if (greetingsCountEl && userId) {
    try {
      const response = await fetch(`/api/player/greetings?userId=${encodeURIComponent(userId)}&dbUrl=${encodeURIComponent(dbUrl)}`);
      const data = await response.json();
      if (data && data.greetingsStack !== undefined) {
        const currentCount = parseInt(greetingsCountEl.textContent, 10) || 0;
        const newCount = data.greetingsStack;
        greetingsCountEl.textContent = newCount;
        
        // Update auth manager's cached value
        user.greetingsStack = newCount;
        auth.updateGreetingsStackLocal(newCount);
        
        // Animate on change
        if (currentCount !== newCount) {
          greetingsCountEl.classList.remove("pulse-active");
          void greetingsCountEl.offsetWidth; // trigger reflow
          greetingsCountEl.classList.add("pulse-active");
        }

        // Apply warning class if less than 50
        if (newCount < 50) {
          greetingsWrapper.classList.add("low-greetings");
        } else {
          greetingsWrapper.classList.remove("low-greetings");
        }
      }
    } catch (e) {
      console.error("Failed to fetch greetings stack:", e);
    }
  }
};

// Attach auth globally
window.auth = auth;
