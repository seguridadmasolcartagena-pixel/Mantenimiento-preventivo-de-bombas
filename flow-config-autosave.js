(() => {
  const FIELD_KEYS = {
    flowUrl: "gestor-bombas-sharepoint-flow-url",
    configSaveFlowUrl: "gestor-bombas-config-save-flow-url",
    configLoadFlowUrl: "gestor-bombas-config-load-flow-url",
  };

  function saveField(field) {
    const key = FIELD_KEYS[field?.name];
    if (!key) return;
    localStorage.setItem(key, String(field.value || "").trim());
  }

  document.addEventListener("input", (event) => {
    saveField(event.target);
  });

  document.addEventListener("submit", (event) => {
    if (event.target?.id !== "flowConfigForm") return;
    event.target.querySelectorAll("textarea[name]").forEach(saveField);
  }, true);
})();