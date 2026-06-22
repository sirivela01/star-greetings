// Star Greetings - User Authentication & Dashboard Logic

// Helper to compress and crop image client-side to a 128x128 JPEG Base64 data URL
function compressImage(file, maxWidth, maxHeight, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Crop to a square centered
      const size = Math.min(width, height);
      const xOffset = (width - size) / 2;
      const yOffset = (height - size) / 2;

      canvas.width = maxWidth;
      canvas.height = maxHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, maxWidth, maxHeight);

      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
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
        uid: uid,
        avatar: fbUser.avatar || ""
      };
      accounts[normalizedUsername] = userToUse;
      this.saveAccounts(accounts);
    } else {
      if (!localUser || localUser.password !== password) {
        return { error: "Invalid username or password!" };
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
      
      if (snapshot.exists()) {
        dbUser = snapshot.val();
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
      }

      const accounts = this.getAccounts();
      const finalUsername = dbUser.username || baseUsername;
      
      accounts[finalUsername] = {
        name: dbUser.name,
        password: "",
        coins: isNaN(parseInt(dbUser.coins, 10)) ? 300 : parseInt(dbUser.coins, 10),
        freeStackBuys: isNaN(parseInt(dbUser.freeStackBuys, 10)) ? 10 : parseInt(dbUser.freeStackBuys, 10),
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

  // Helper to hide all main views
  function hideAllViews() {
    [loginView, signupView, forgotView, dashboardView, setupView, gameView].forEach(view => {
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
  let splashResolved = false;
  function resolveSplash() {
    if (splashResolved) return;
    splashResolved = true;
    const splash = document.getElementById("cold-start-splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 500);
    }
  }

  // Set a fallback timeout for the splash screen in case we are offline or Firebase is slow
  setTimeout(resolveSplash, 2000);

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
            showDashboard(currentUser);
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
            showDashboard(currentUser);
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
        showDashboard(currentUser);
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
      showDashboard(currentUser);
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
        showDashboard(res.user);
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
    googleBtn.addEventListener("click", () => handleSocialLogin(googleBtn, "google"));
  }
  if (facebookBtn) {
    facebookBtn.addEventListener("click", () => handleSocialLogin(facebookBtn, "facebook"));
  }

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
          showDashboard(res.user);
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
  const avatarModalCloseBtn = document.getElementById("profile-avatar-close-btn");
  const avatarModalChangeBtn = document.getElementById("profile-avatar-change-btn");

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
  if (avatarModalCloseBtn) {
    avatarModalCloseBtn.addEventListener("click", closeAvatarModal);
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

      compressImage(file, 512, 512, async (compressedDataUrl) => {
        const res = await auth.updateAvatar(compressedDataUrl);
        if (avatarContainer) avatarContainer.style.opacity = "1";
        if (avatarModal) avatarModal.style.opacity = "1";
        
        if (res.success) {
          const currentUser = auth.getCurrentUser();
          if (currentUser) {
            showDashboard(currentUser);
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
});

// Attach auth globally
window.auth = auth;
