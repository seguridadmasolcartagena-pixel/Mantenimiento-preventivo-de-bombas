const DEFAULT_FLOW_URL = "https://default65afa47b9e4e4ad28cfe30d4118f06.2e.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/27/workflows/7275738c6cd249f9b5ef74764c13738e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=7DRW9AOkRKLGRKdw0zv65SIDATeG8QlE-g8KsqO1E4s";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120000;
const ACCEPTED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx",
  "txt", "csv", "png", "jpg", "jpeg", "webp",
]);
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
  section.innerHTML = `
    <div class="section-heading pump-documents-heading">
      <div>
        <h4>Subir documentación</h4>
        <span>Los archivos se guardan en la carpeta documental de SharePoint y quedan disponibles para la integración con el asistente.</span>
      </div>
      <div class="pump-document-actions">
        <button class="button button-small" type="button" data-upload-action="choose-file" ${busy ? "disabled" : ""}>Seleccionar archivo</button>
        <input id="pumpDocumentFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp" hidden />
      </div>
    </div>
    <p class="pump-documents-message ${messageIsError ? "error" : ""}" aria-live="polite">${escapeHtml(message)}</p>
  `;

  section.querySelector("[data-upload-action='choose-file']")?.addEventListener("click", () => {
    section.querySelector("#pumpDocumentFile")?.click();
  });
  section.querySelector("#pumpDocumentFile")?.addEventListener("change", (event) => {
    void uploadDocument(event, section);
  });
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

  busy = true;
  message = `Subiendo ${file.name}...`;
  messageIsError = false;
  render(section);

  try {
    await requestFlow({
      nombreArchivo: sanitizeFileName(file.name),
      contenidoBase64: await fileToBase64(file),
      tipoMime: file.type || "application/octet-stream",
    });
    message = `${file.name} se ha guardado correctamente en SharePoint.`;
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
    const response = await fetch(DEFAULT_FLOW_URL, {
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
        data = { mensaje: text.slice(0, 300) };
      }
    }
    if (response.status === 401) {
      throw new Error("El flujo no autoriza la subida. Revisa en Power Automate quién puede desencadenarlo.");
    }
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || data?.mensaje || data?.message || `Power Automate devolvió el código ${response.status}.`);
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
