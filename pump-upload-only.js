const FLOW_URL_KEY = "gestor-bombas-documents-flow-url";
const GLOBAL_CODE = "GLOBAL";
const DOCUMENTS_FOLDER_NAME = "Documentacion_Bombas";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120000;
const ACCEPTED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx",
  "txt", "csv", "png", "jpg", "jpeg", "webp",
]);
let configuredFlowUrl = loadFlowUrl();
let configurationOpen = !configuredFlowUrl;
let busy = false;
let mountScheduled = false;
let message = "";
let messageIsError = false;

window.PumpDocuments = Object.freeze({
  getAgentContext: () => [],
  refresh: refreshUploadSection,
});

scheduleMount();
new MutationObserver(scheduleMount).observe(document.querySelector("#app"), {
  childList: true,
  subtree: true,
});

function scheduleMount() {
  if (mountScheduled) return;
  mountScheduled = true;
  window.requestAnimationFrame(() => {
    mountScheduled = false;
    mountUploadSection();
  });
}

function mountUploadSection() {
  const main = document.querySelector(".main");
  const workspace = main?.querySelector(".workspace");
  if (!main || !workspace) return;

  let section = main.querySelector("#pumpDocumentsSection");
  if (section) return;
  section = document.createElement("section");
  section.id = "pumpDocumentsSection";
  section.className = "pump-documents-section global-documents-panel";
  main.insertBefore(section, workspace);
  render(section);
}

function refreshUploadSection() {
  const section = document.querySelector("#pumpDocumentsSection");
  if (section) render(section);
  else scheduleMount();
}

function render(section) {
  const configured = Boolean(configuredFlowUrl);
  section.innerHTML = `
    <div class="section-heading pump-documents-heading">
      <div>
        <h4>Subir documentación</h4>
        <span>Los archivos se guardan en SharePoint y no se muestran en la aplicación.</span>
      </div>
      <div class="pump-document-actions">
        <button class="button secondary button-small" type="button" data-upload-action="configure" ${busy ? "disabled" : ""}>Conexión</button>
        <button class="button button-small" type="button" data-upload-action="choose-file" ${configured && !busy ? "" : "disabled"}>Seleccionar archivo</button>
        <input id="pumpDocumentFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp" hidden />
      </div>
    </div>
    ${configurationOpen ? renderConfigurationForm() : ""}
    <p class="pump-documents-message ${messageIsError ? "error" : ""}" aria-live="polite">${escapeHtml(message)}</p>
  `;

  section.querySelectorAll("[data-upload-action='configure']").forEach((button) => {
    button.addEventListener("click", () => {
      configurationOpen = !configurationOpen;
      message = "";
      render(section);
    });
  });
  section.querySelector("[data-upload-action='choose-file']")?.addEventListener("click", () => {
    section.querySelector("#pumpDocumentFile")?.click();
  });
  section.querySelector("#pumpDocumentConfig")?.addEventListener("submit", (event) => {
    saveConfiguration(event, section);
  });
  section.querySelector("#pumpDocumentFile")?.addEventListener("change", (event) => {
    void uploadDocument(event, section);
  });
}

function renderConfigurationForm() {
  return `
    <form class="pump-document-config" id="pumpDocumentConfig">
      <label>
        URL del flujo documental de Power Automate
        <input class="field" type="url" name="flowUrl" value="${escapeHtml(configuredFlowUrl)}" placeholder="https://..." autocomplete="off" required />
      </label>
      <div class="pump-document-config-actions">
        ${configuredFlowUrl ? '<button class="button secondary button-small" type="button" data-upload-action="configure">Cancelar</button>' : ""}
        <button class="button button-small" type="submit">Guardar conexión</button>
      </div>
    </form>
  `;
}

function saveConfiguration(event, section) {
  event.preventDefault();
  const url = String(new FormData(event.currentTarget).get("flowUrl") || "").trim();
  if (!isSecureUrl(url)) {
    message = "La URL debe comenzar por https://";
    messageIsError = true;
    render(section);
    return;
  }

  localStorage.setItem(FLOW_URL_KEY, url);
  configuredFlowUrl = url;
  configurationOpen = false;
  message = "Conexión documental guardada.";
  messageIsError = false;
  render(section);
}

async function uploadDocument(event, section) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || busy) return;

  const validationError = validateFile(file);
  if (validationError) {
    message = validationError;
    messageIsError = true;
    render(section);
    return;
  }

  const scope = { code: GLOBAL_CODE, name: "Documentación global de planta" };

  busy = true;
  message = `Subiendo ${file.name}...`;
  messageIsError = false;
  render(section);

  try {
    await requestFlow({
      action: "upload",
      pumpCode: scope.code,
      pumpName: scope.name,
      folderName: DOCUMENTS_FOLDER_NAME,
      fileName: sanitizeFileName(file.name),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      category: "",
      description: "",
      contentBase64: await fileToBase64(file),
    });
    message = `${file.name} se ha guardado en SharePoint.`;
    messageIsError = false;
  } catch (error) {
    message = error.message || "No se pudo subir el documento.";
    messageIsError = true;
  } finally {
    busy = false;
    render(section);
  }
}

async function requestFlow(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(configuredFlowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      signal: controller.signal,
    });
    const text = await response.text();
    let data = {};
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text.slice(0, 300) };
      }
    }
    if (response.status === 401) {
      throw new Error('El flujo no autoriza la subida. En Power Automate selecciona "Cualquiera" en "Quién puede desencadenar el flujo", guarda y actualiza la URL en Conexión.');
    }
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || data?.message || `Power Automate devolvió el código ${response.status}.`);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("La subida ha superado el tiempo de espera.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function validateFile(file) {
  const extension = fileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(extension)) return "Tipo de archivo no admitido.";
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > MAX_FILE_SIZE) return "El archivo supera el límite de 20 MB.";
  return "";
}

function loadFlowUrl() {
  const url = String(localStorage.getItem(FLOW_URL_KEY) || "").trim();
  return isSecureUrl(url) ? url : "";
}

function isSecureUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeFileName(value) {
  return String(value || "documento")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .slice(0, 180) || "documento";
}

function fileExtension(value) {
  return String(value || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "").split(",").at(-1) || ""), { once: true });
    reader.addEventListener("error", () => reject(new Error("No se pudo leer el archivo.")), { once: true });
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
