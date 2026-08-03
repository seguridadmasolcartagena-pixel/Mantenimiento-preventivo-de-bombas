(() => {
  const PUMPS_KEY = "gestor-bombas-v3";
  const VIEWDATA_KEY = "gestor-bombas-viewdata-v1";
  const SAVE_FLOW_KEY = "gestor-bombas-config-save-flow-url";

  function parseJson(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function selectedPumpCode() {
    const modalCode = document.querySelector("#resetPumpTitle")
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

  async function resetPumpPreservingMasterHistory(event) {
    const button = event.target?.closest?.("#confirmResetPump");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const code = selectedPumpCode();
    const pumps = parseJson(localStorage.getItem(PUMPS_KEY), []);
    const viewDataBlocks = parseJson(localStorage.getItem(VIEWDATA_KEY), []);
    const updatedPumps = pumps.map((pump) =>
      String(pump.code || "").trim().toLowerCase() === code.toLowerCase()
        ? { ...pump, measurements: [] }
        : pump,
    );

    localStorage.setItem(PUMPS_KEY, JSON.stringify(updatedPumps));
    localStorage.setItem(VIEWDATA_KEY, JSON.stringify(viewDataBlocks));
    await syncSharedData(updatedPumps, viewDataBlocks);
    window.location.reload();
  }

  function updateResetCopy() {
    const title = document.querySelector("#resetPumpTitle");
    const paragraph = title?.closest(".confirm-modal")?.querySelector("p:not(.eyebrow)");
    const code = paragraph?.querySelector("strong")?.textContent || selectedPumpCode();
    if (!paragraph || !code) return;

    paragraph.innerHTML = `Se limpiaran las medidas activas de <strong>${code}</strong> para iniciar una nueva etapa de seguimiento. El historial maestro importado se conservara para analisis de tendencias.`;
  }

  document.addEventListener("click", resetPumpPreservingMasterHistory, true);
  new MutationObserver(updateResetCopy).observe(document.documentElement, { childList: true, subtree: true });
  updateResetCopy();
})();
