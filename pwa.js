(() => {
  "use strict";

  const state = window.MASOL_INSTALL_STATE || { promptEvent: null };
  window.MASOL_INSTALL_STATE = state;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.promptEvent = event;
    document.dispatchEvent(new CustomEvent("masol-install-prompt-ready"));
  });

  window.addEventListener("appinstalled", () => {
    state.promptEvent = null;
    document.querySelector("#installApp")?.setAttribute("hidden", "");
  });

  async function requestInstall() {
    if (isStandalone()) {
      document.querySelector("#installApp")?.setAttribute("hidden", "");
      return { status: "installed", message: "La aplicación ya está instalada." };
    }

    if (!state.promptEvent) {
      const appleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
      return {
        status: "manual",
        message: appleMobile
          ? "En iPhone o iPad, abre Compartir y selecciona Añadir a pantalla de inicio."
          : "Abre el menú del navegador y selecciona Instalar aplicación o Añadir a pantalla de inicio.",
      };
    }

    try {
      await state.promptEvent.prompt();
      const choice = await state.promptEvent.userChoice;
      state.promptEvent = null;
      if (choice.outcome === "accepted") {
        document.querySelector("#installApp")?.setAttribute("hidden", "");
        return { status: "accepted", message: "Instalación iniciada." };
      }
      return { status: "dismissed", message: "Instalación cancelada. Puedes volver a intentarlo." };
    } catch {
      state.promptEvent = null;
      return { status: "manual", message: "Usa el menú del navegador para instalar la aplicación." };
    }
  }

  window.MASOL_PWA = Object.freeze({ isStandalone, requestInstall });

  if ("serviceWorker" in navigator) {
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("./service-worker.js", {
          updateViaCache: "none",
        });
        await registration.update();
      } catch (error) {
        console.warn("No se pudo actualizar la aplicación instalada.", error);
      }
    };
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });
  }
})();
