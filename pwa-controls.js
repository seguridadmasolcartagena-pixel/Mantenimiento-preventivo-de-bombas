(() => {
  "use strict";

  const INSTALL_BUTTON_ID = "installAppButton";
  const UPDATE_BUTTON_ID = "updateAppButton";
  const UPDATE_RESULT_KEY = "bombas-pwa-update-result";
  let deferredInstallPrompt = null;
  let registration = null;
  let updateInProgress = false;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    ensureControls();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    ensureControls();
  });

  start();

  async function start() {
    observeToolbar();
    showCompletedUpdate();
    if (!("serviceWorker" in navigator)) return;

    try {
      registration = await navigator.serviceWorker.register("./sw.js", {
        scope: "./",
        updateViaCache: "none",
      });
    } catch (error) {
      console.error("No se pudo registrar la aplicación instalable.", error);
    }
  }

  function observeToolbar() {
    const app = document.querySelector("#app");
    if (!app) return;
    ensureControls();
    new MutationObserver(ensureControls).observe(app, { childList: true, subtree: true });
  }

  function ensureControls() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return;

    let installButton = toolbar.querySelector(`#${INSTALL_BUTTON_ID}`);
    if (!installButton) {
      installButton = createButton(INSTALL_BUTTON_ID, "Instalar", installApplication);
      toolbar.append(installButton);
    }

    const installed = isStandalone();
    installButton.textContent = installed ? "Instalada" : "Instalar";
    installButton.disabled = installed;
    installButton.title = installed ? "La aplicación ya está instalada" : "Instalar la aplicación en este dispositivo";

    if (!toolbar.querySelector(`#${UPDATE_BUTTON_ID}`)) {
      const updateButton = createButton(UPDATE_BUTTON_ID, "Actualizar", updateApplication);
      updateButton.title = "Comprobar y cargar la última versión";
      toolbar.append(updateButton);
    }
  }

  function createButton(id, label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    button.className = "button secondary pwa-control";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  async function installApplication() {
    if (isStandalone()) return;

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      ensureControls();
      return;
    }

    const message = isIos()
      ? "En Safari, pulsa Compartir y después Añadir a pantalla de inicio."
      : "El navegador todavía no ofrece la instalación. Usa Chrome o Edge y vuelve a intentarlo cuando termine de cargar.";
    window.alert(message);
  }

  async function updateApplication() {
    if (updateInProgress) return;
    const button = document.querySelector(`#${UPDATE_BUTTON_ID}`);
    updateInProgress = true;
    setButtonState(button, "Buscando...", true);

    try {
      if (!("serviceWorker" in navigator)) throw new Error("Este navegador no admite actualizaciones instalables.");
      registration ||= await navigator.serviceWorker.getRegistration("./");
      registration ||= await navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" });

      const activation = waitForUpdate(registration);
      await registration.update();
      const worker = registration.waiting || await activation;

      sessionStorage.setItem(UPDATE_RESULT_KEY, "1");
      if (worker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, { once: true });
        worker.postMessage({ type: "SKIP_WAITING" });
        window.setTimeout(reloadOnce, 4000);
      } else {
        window.location.reload();
      }
    } catch (error) {
      setButtonState(button, "Reintentar", false);
      window.alert(error.message || "No se pudo actualizar la aplicación.");
      updateInProgress = false;
    }
  }

  function waitForUpdate(serviceWorkerRegistration) {
    if (serviceWorkerRegistration.waiting) return Promise.resolve(serviceWorkerRegistration.waiting);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (worker = null) => {
        if (settled) return;
        settled = true;
        resolve(worker);
      };
      const onUpdateFound = () => {
        const worker = serviceWorkerRegistration.installing;
        if (!worker) return finish();
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") finish(worker);
          if (worker.state === "redundant") finish();
        });
      };
      serviceWorkerRegistration.addEventListener("updatefound", onUpdateFound, { once: true });
      window.setTimeout(() => finish(serviceWorkerRegistration.waiting), 2500);
    });
  }

  function reloadOnce() {
    if (reloadOnce.called) return;
    reloadOnce.called = true;
    window.location.reload();
  }

  function showCompletedUpdate() {
    if (sessionStorage.getItem(UPDATE_RESULT_KEY) !== "1") return;
    sessionStorage.removeItem(UPDATE_RESULT_KEY);

    const show = () => {
      const button = document.querySelector(`#${UPDATE_BUTTON_ID}`);
      if (!button) return window.requestAnimationFrame(show);
      setButtonState(button, "Actualizada", true);
      window.setTimeout(() => setButtonState(button, "Actualizar", false), 2200);
    };
    show();
  }

  function setButtonState(button, label, disabled) {
    if (!button) return;
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute("aria-busy", String(disabled && label !== "Actualizada"));
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }
})();
