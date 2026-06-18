// Star Greetings - User Authentication & Dashboard Logic

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

  signup(name, username, password) {
    const accounts = this.getAccounts();
    const normalizedUsername = username.trim().toLowerCase();
    
    if (accounts[normalizedUsername]) {
      return { error: "Username already exists!" };
    }

    accounts[normalizedUsername] = {
      name: name.trim(),
      password: password,
      coins: 300,
      freeStackBuys: 10
    };

    this.saveAccounts(accounts);
    return { success: true };
  }

  login(username, password, rememberMe) {
    const accounts = this.getAccounts();
    const normalizedUsername = username.trim().toLowerCase();
    const user = accounts[normalizedUsername];

    if (!user || user.password !== password) {
      return { error: "Invalid username or password!" };
    }

    // Save session
    localStorage.setItem(this.sessionKey, normalizedUsername);

    // Save remember details
    if (rememberMe) {
      localStorage.setItem(this.rememberKey, JSON.stringify({ username: normalizedUsername, password }));
    } else {
      localStorage.removeItem(this.rememberKey);
    }

    return { success: true, user };
  }

  resetPassword(username, newPassword) {
    const accounts = this.getAccounts();
    const normalizedUsername = username.trim().toLowerCase();

    if (!accounts[normalizedUsername]) {
      return { error: "Username not found!" };
    }

    accounts[normalizedUsername].password = newPassword;
    this.saveAccounts(accounts);
    return { success: true };
  }

  logout() {
    localStorage.removeItem(this.sessionKey);
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

  // Helper to hide all main views
  function hideAllViews() {
    [loginView, signupView, forgotView, dashboardView, setupView, gameView].forEach(view => {
      if (view) view.classList.add("hidden");
    });
  }

  // Render profile dashboard data
  function showDashboard(user) {
    hideAllViews();
    dashboardView.classList.remove("hidden");
    profileNameLabel.textContent = user.name;
    profileCoinsLabel.textContent = user.coins;
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

  // Route initial page load
  const currentUser = auth.getCurrentUser();
  if (currentUser) {
    showDashboard(currentUser);
  } else {
    hideAllViews();
    loginView.classList.remove("hidden");
    initLoginForm();
  }

  // --- BUTTON CLICKS & TRIGGERS ---

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
      setupView.classList.remove("hidden");
      
      // Auto-fill logged in user as Player 1 name in the game-setup form
      const user = auth.getCurrentUser();
      const p1Input = document.getElementById("player-name-1");
      if (user && p1Input) {
        p1Input.value = user.name;
        // Make sure it locks Player 1 name or keeps it editable
      }
    });
  }

  // --- FORM SUBMISSIONS ---

  // Handle Login Form Submit
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const userVal = document.getElementById("login-username").value.trim();
      const passVal = document.getElementById("login-password").value;
      const rememberVal = document.getElementById("login-remember").checked;

      if (!userVal || !passVal) {
        alert("Please enter both username and password.");
        return;
      }

      const res = auth.login(userVal, passVal, rememberVal);
      if (res.success) {
        showDashboard(res.user);
      } else {
        alert(res.error);
      }
    });
  }

  // Handle Sign Up Form Submit
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
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

      const res = auth.signup(nameVal, userVal, passVal);
      if (res.success) {
        alert("Account created successfully! Please log in.");
        hideAllViews();
        loginView.classList.remove("hidden");
        initLoginForm();
        document.getElementById("login-username").value = userVal;
      } else {
        alert(res.error);
      }
    });
  }

  // Handle Forgot Password Form Submit
  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
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

      const res = auth.resetPassword(userVal, passVal);
      if (res.success) {
        alert("Password updated successfully! Log in with your new password.");
        hideAllViews();
        loginView.classList.remove("hidden");
        initLoginForm();
        document.getElementById("login-username").value = userVal;
      } else {
        alert(res.error);
      }
    });
  }
});

// Attach auth globally
window.auth = auth;
