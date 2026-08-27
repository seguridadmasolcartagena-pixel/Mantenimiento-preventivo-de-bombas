(() => {
  "use strict";

  const SESSION_KEY = "masol-pumps-auth-session-v1";
  const ATTEMPTS_KEY = "masol-pumps-auth-attempts-v1";
  const LOCK_KEY = "masol-pumps-auth-lock-v1";
  const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
  const LOCK_DURATION_MS = 5 * 60 * 1000;
  const MAX_ATTEMPTS = 5;
  const CREDENTIAL_SALT = "pump-maintenance-2026";
  const CREDENTIAL_HASH = "c5c2fdc13e5a50820763d623d5cfd1d4085525010980ae35d682a44bc9a80671";

  const app = document.querySelector("#app");

  if (hasActiveSession()) {
    void loadApplication();
  } else {
    renderLogin();
  }

  function hasActiveSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      const isActive =
        session?.authenticated === true &&
        Number.isFinite(session.createdAt) &&
        Date.now() - session.createdAt < SESSION_DURATION_MS;

      if (!isActive) sessionStorage.removeItem(SESSION_KEY);
      return isActive;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
  }

  function renderLogin(message = "", isError = false) {
    const lockRemaining = getLockRemaining();
    const disabled = lockRemaining > 0;

    app.innerHTML = `
      <main class="login-page">
        <section class="login-panel" aria-labelledby="loginTitle">
          <img class="login-logo" src="./assets/masol-logo.svg" alt="Masol Iberia Biofuel" />
          <div class="login-heading">
            <p>Acceso interno</p>
            <h1 id="loginTitle">Mantenimiento preventivo de las bombas de la planta</h1>
          </div>
          <form class="login-form" id="loginForm">
            <label>
              Usuario
              <input
                id="loginUser"
                name="username"
                type="text"
                autocomplete="username"
                autocapitalize="none"
                spellcheck="false"
                required
                ${disabled ? "disabled" : ""}
              />
            </label>
            <label>
              Contraseña
              <span class="login-password">
                <input
                  id="loginPassword"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  ${disabled ? "disabled" : ""}
                />
                <button type="button" id="togglePassword" aria-label="Mostrar contraseña" ${disabled ? "disabled" : ""}>
                  Mostrar
                </button>
              </span>
            </label>
            <p class="login-message ${isError ? "error" : ""}" id="loginMessage" aria-live="polite">
              ${disabled ? formatLockMessage(lockRemaining) : escapeHtml(message)}
            </p>
            <button class="login-submit" type="submit" ${disabled ? "disabled" : ""}>
              Iniciar sesión
            </button>
          </form>
        </section>
      </main>
    `;

    document.querySelector("#loginForm")?.addEventListener("submit", handleLogin);
    document.querySelector("#togglePassword")?.addEventListener("click", togglePasswordVisibility);
    document.querySelector("#loginUser")?.focus();

    if (disabled) {
      window.setTimeout(() => renderLogin("", true), Math.min(lockRemaining, 1000));
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const lockRemaining = getLockRemaining();
    if (lockRemaining > 0) {
      renderLogin("", true);
      return;
    }

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    const candidateHash = await sha256(`${username}\u0000${password}\u0000${CREDENTIAL_SALT}`);

    if (candidateHash === CREDENTIAL_HASH) {
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCK_KEY);
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ authenticated: true, createdAt: Date.now() }),
      );
      await loadApplication();
      return;
    }

    registerFailedAttempt();
  }

  function registerFailedAttempt() {
    const attempts = Number(localStorage.getItem(ATTEMPTS_KEY) || "0") + 1;

    if (attempts >= MAX_ATTEMPTS) {
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_DURATION_MS));
      renderLogin("", true);
      return;
    }

    localStorage.setItem(ATTEMPTS_KEY, String(attempts));
    const remaining = MAX_ATTEMPTS - attempts;
    renderLogin(
      `Usuario o contraseña incorrectos. Quedan ${remaining} intento${remaining === 1 ? "" : "s"}.`,
      true,
    );
  }

  function getLockRemaining() {
    const lockedUntil = Number(localStorage.getItem(LOCK_KEY) || "0");
    const remaining = lockedUntil - Date.now();

    if (remaining <= 0) {
      localStorage.removeItem(LOCK_KEY);
      return 0;
    }

    return remaining;
  }

  function formatLockMessage(milliseconds) {
    const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
    return `Acceso bloqueado temporalmente. Inténtalo de nuevo en ${minutes} min.`;
  }

  function togglePasswordVisibility() {
    const input = document.querySelector("#loginPassword");
    const button = document.querySelector("#togglePassword");
    if (!input || !button) return;

    const showPassword = input.type === "password";
    input.type = showPassword ? "text" : "password";
    button.textContent = showPassword ? "Ocultar" : "Mostrar";
    button.setAttribute(
      "aria-label",
      showPassword ? "Ocultar contraseña" : "Mostrar contraseña",
    );
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }

  async function loadApplication() {
    app.innerHTML = '<div class="auth-loading" role="status">Cargando aplicación...</div>';

    await loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
    await loadScript("./flow-config-autosave.js");
    await loadScript("./alert-notifications.js");
    await loadScript("./spanish-date-fix.js");
    await loadScript("./plant-notes-actions.js?v=20260825-record-actions-v2");
    await loadScript("./incident-actions.js?v=20260825-incident-actions-v3");
    await loadScript("./app.js?v=20260826-remove-threshold-banner", "module");
    await loadScript("./pump-upload-only.js?v=20260827-documents-flow-v2", "module");

    installLogoutControl();
    scheduleSessionExpiry();
  }

  function scheduleSessionExpiry() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      const remaining = SESSION_DURATION_MS - (Date.now() - Number(session?.createdAt || 0));
      window.setTimeout(logout, Math.max(0, remaining));
    } catch {
      logout();
    }
  }

  function loadScript(src, type = "text/javascript") {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.type = type;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error(`No se pudo cargar ${src}`)),
        { once: true },
      );
      document.body.append(script);
    });
  }

  function installLogoutControl() {
    const addButton = () => {
      const toolbar = document.querySelector(".toolbar");
      if (!toolbar || toolbar.querySelector("#logoutButton")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.id = "logoutButton";
      button.className = "button secondary auth-logout";
      button.textContent = "Cerrar sesión";
      button.addEventListener("click", logout);
      toolbar.append(button);
    };

    addButton();
    new MutationObserver(addButton).observe(app, { childList: true, subtree: true });
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
