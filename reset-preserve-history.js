(() => {
  const PUMPS_KEY = "gestor-bombas-v3";
  const VIEWDATA_KEY = "gestor-bombas-viewdata-v1";
  const SAVE_FLOW_KEY = "gestor-bombas-config-save-flow-url";
  const LOAD_FLOW_KEY = "gestor-bombas-config-load-flow-url";
  const LOCAL_RESET_PAYLOAD_KEY = "gestor-bombas-reset-local-payload";

  function parseJson(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function selectedPumpCode() {
    const modalCode = document
      .querySelector("#resetPumpTitle")
      ?.closest(".confirm-modal")
      ?.querySelector("p strong")
      ?.textContent
      ?.trim();
    if (modalCode) return modalCode;

    const detailTitle = document.querySelector("#pumpDetail .panel-header h3")?.textContent || "";
    return detailTitle.split("·")[0]?.trim() || "";
  }

  async function syncSharedData(pumps, viewDataBlocks) {
    const url = localStorage.getItem(SAVE_FLOW_KEY);
    if (!url) return;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        source: "App mantenimiento preventivo de bombas",
        pumps,
        viewDataBlocks,
      }),
    }).catch(() => undefined);
  }

  function sharedPayload(pumps, viewDataBlocks) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "App mantenimiento preventivo de bombas",
      pumps,
      viewDataBlocks,
    };
  }

  function installLoadGuard() {
    if (window.__bombasResetLoadGuard || !window.fetch) return;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (resource, options = {}) => {
      const loadUrl = localStorage.getItem(LOAD_FLOW_KEY);
      const url = typeof resource === "string" ? resource : resource?.url;
      const payload = sessionStorage.getItem(LOCAL_RESET_PAYLOAD_KEY);

      if (payload && loadUrl && url === loadUrl) {
        sessionStorage.removeItem(LOCAL_RESET_PAYLOAD_KEY);
        return Promise.resolve(new Response(payload, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }

      return originalFetch(resource, options);
    };
    window.__bombasResetLoadGuard = true;
  }

  async function confirmResetWithoutDeletingHistory(event) {
    const button = event.target?.closest?.("#confirmResetPump");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const code = selectedPumpCode();
    if (!code) return;

    const pumps = parseJson(localStorage.getItem(PUMPS_KEY), []);
    const viewDataBlocks = parseJson(localStorage.getItem(VIEWDATA_KEY), []);
    const normalizedCode = code.toLowerCase();
    const updatedPumps = pumps.map((pump) =>
      String(pump.code || "").trim().toLowerCase() === normalizedCode
        ? { ...pump, measurements: [] }
        : pump,
    );

    localStorage.setItem(PUMPS_KEY, JSON.stringify(updatedPumps));
    localStorage.setItem(VIEWDATA_KEY, JSON.stringify(viewDataBlocks));
    sessionStorage.setItem(LOCAL_RESET_PAYLOAD_KEY, JSON.stringify(sharedPayload(updatedPumps, viewDataBlocks)));
    await syncSharedData(updatedPumps, viewDataBlocks);
    window.location.reload();
  }

  installLoadGuard();
  document.addEventListener("click", confirmResetWithoutDeletingHistory, true);
})();