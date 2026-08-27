const FLOW_URL_KEY = "gestor-bombas-documents-flow-url";
const CACHE_KEY = "gestor-bombas-global-documents-cache-v1";
const GLOBAL_CODE = "GLOBAL";
const GLOBAL_FOLDER_NAME = "Global";
const GLOBAL_LIBRARY_NAME = "Documentación global de planta";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "xlsm",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);
const DOCUMENT_CATEGORIES = [
  "Ficha técnica",
  "Manual",
  "Plano",
  "Certificado",
  "Informe",
  "Otro",
];

const documentsByPump = loadCache();
const loadedPumps = new Set();
let mountScheduled = false;
let busy = false;
let configurationOpen = false;

window.PumpDocuments = Object.freeze({
  getAgentContext,
  refresh: () => scheduleMount(true),
});

scheduleMount();
new MutationObserver(() => scheduleMount()).observe(document.querySelector("#app"), {
  childList: true,
  subtree: true,
});

function scheduleMount(forceRefresh = false) {
  if (mountScheduled) return;
  mountScheduled = true;
  window.requestAnimationFrame(() => {
    mountScheduled = false;
    mountDocumentsSection(forceRefresh);
  });
}

function mountDocumentsSection(forceRefresh = false) {
  const main = document.querySelector(".main");
  const workspace = main?.querySelector(".workspace");
  if (!main || !workspace) return;

  let section = main.querySelector("#pumpDocumentsSection");
  const needsMount = !section;

  if (needsMount) {
    section = document.createElement("section");
    section.id = "pumpDocumentsSection";
    section.className = "pump-documents-section global-documents-panel";
    section.dataset.pumpCode = GLOBAL_CODE;
    section.dataset.pumpName = GLOBAL_LIBRARY_NAME;
    section.dataset.folderName = GLOBAL_FOLDER_NAME;
    main.insertBefore(section, workspace);
    renderDocumentsSection(section);
  }

  if (forceRefresh) loadedPumps.delete(GLOBAL_CODE);
  if (getFlowUrl() && !loadedPumps.has(GLOBAL_CODE) && !busy) {
    void loadDocuments(GLOBAL_CODE, section, { refresh: forceRefresh });
  }
}

function renderDocumentsSection(section, message = "", isError = false) {
  if (!section) return;
  const pumpCode = section.dataset.pumpCode;
  const documents = documentsByPump.get(pumpCode) || [];
  const configured = Boolean(getFlowUrl());

  section.innerHTML = `
    <div class="section-heading pump-documents-heading">
      <div>
        <h4>Documentación global de planta</h4>
        <span>${documents.length} documento${documents.length === 1 ? "" : "s"} disponible${documents.length === 1 ? "" : "s"}</span>
      </div>
      <div class="pump-document-actions">
        <button class="button secondary button-small" type="button" data-document-action="configure" ${busy ? "disabled" : ""}>Conexión</button>
        <button class="button secondary button-small" type="button" data-document-action="refresh" ${configured && !busy ? "" : "disabled"}>Actualizar</button>
        <button class="button button-small" type="button" data-document-action="choose" ${configured && !busy ? "" : "disabled"}>Subir documento</button>
      </div>
    </div>
    ${configured && !configurationOpen ? renderUploadControls() : renderConfigurationForm(configured)}
    <p class="pump-documents-message ${isError ? "error" : ""}" aria-live="polite">${escapeHtml(message)}</p>
    ${renderDocumentList(documents)}
  `;

  bindSectionEvents(section);
}

function renderUploadControls() {
  return `
    <div class="pump-document-upload-options">
      <label>
        Tipo
        <select class="field" id="documentCategory" ${busy ? "disabled" : ""}>
          ${DOCUMENT_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("")}
        </select>
      </label>
      <label>
        Descripción
        <input class="field" id="documentDescription" maxlength="240" placeholder="Ej. Curva y datos del fabricante" ${busy ? "disabled" : ""} />
      </label>
      <input id="pumpDocumentFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp" hidden />
    </div>
  `;
}

function renderConfigurationForm(configured) {
  return `
    <form class="pump-document-config" id="pumpDocumentConfig">
      <label>
        URL del flujo documental de Power Automate
        <input class="field" type="url" name="flowUrl" value="${escapeHtml(getFlowUrl())}" placeholder="https://..." autocomplete="off" required />
      </label>
      <div class="pump-document-config-actions">
        ${configured ? '<button class="button secondary button-small" type="button" data-document-action="cancel-config">Cancelar</button>' : ""}
        <button class="button button-small" type="submit">Guardar conexión</button>
      </div>
    </form>
  `;
}

function renderDocumentList(documents) {
  if (!documents.length) {
    return '<div class="empty-inline pump-documents-empty">No hay documentación global cargada.</div>';
  }

  return `
    <div class="pump-document-list">
      ${documents.map((document) => `
        <article class="pump-document-row">
          <div class="pump-document-main">
            <span class="pump-document-type">${escapeHtml(document.extension || "DOC")}</span>
            <div>
              <strong>${escapeHtml(document.name)}</strong>
              <p>${escapeHtml(document.category)}${document.description ? ` · ${escapeHtml(document.description)}` : ""}</p>
              <small>${formatFileSize(document.size)} · ${formatDate(document.uploadedAt)}</small>
            </div>
          </div>
          <div class="pump-document-row-actions">
            ${document.url ? `<a class="button secondary button-small" href="${escapeHtml(document.url)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ""}
            <button class="button secondary button-small pump-document-delete" type="button" data-document-delete="${escapeHtml(document.id)}" ${busy ? "disabled" : ""}>Eliminar</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function bindSectionEvents(section) {
  section.querySelector("#pumpDocumentConfig")?.addEventListener("submit", saveFlowConfiguration);
  section.querySelector("[data-document-action='configure']")?.addEventListener("click", () => {
    configurationOpen = !configurationOpen;
    renderDocumentsSection(section);
  });
  section.querySelector("[data-document-action='cancel-config']")?.addEventListener("click", () => {
    configurationOpen = false;
    renderDocumentsSection(section);
  });
  section.querySelector("[data-document-action='choose']")?.addEventListener("click", () => {
    section.querySelector("#pumpDocumentFile")?.click();
  });
  section.querySelector("#pumpDocumentFile")?.addEventListener("change", (event) => {
    void uploadDocument(event, section);
  });
  section.querySelector("[data-document-action='refresh']")?.addEventListener("click", () => {
    void loadDocuments(section.dataset.pumpCode, section, { refresh: true });
  });
  section.querySelectorAll("[data-document-delete]").forEach((button) => {
    button.addEventListener("click", () => void deleteDocument(button.dataset.documentDelete, section));
  });
}

function saveFlowConfiguration(event) {
  event.preventDefault();
  const url = String(new FormData(event.currentTarget).get("flowUrl") || "").trim();
  if (!isSecureUrl(url)) {
    renderDocumentsSection(event.currentTarget.closest("#pumpDocumentsSection"), "La URL debe comenzar por https://", true);
    return;
  }

  localStorage.setItem(FLOW_URL_KEY, url);
  configurationOpen = false;
  loadedPumps.clear();
  const section = event.currentTarget.closest("#pumpDocumentsSection");
    renderDocumentsSection(section, "Conexión documental guardada.");
  void loadDocuments(section.dataset.pumpCode, section, { refresh: true });
}

async function loadDocuments(pumpCode, section, { refresh = false } = {}) {
  if (!getFlowUrl() || busy) return;
  if (!refresh && loadedPumps.has(pumpCode)) return;

  setBusy(section, true, "Cargando documentos...");
  try {
    const response = await requestFlow({
      action: "list",
      pumpCode,
      folderName: section.dataset.folderName || GLOBAL_FOLDER_NAME,
    });
    const documents = normalizeDocuments(response?.documents || response?.value || []);
    documentsByPump.set(pumpCode, documents);
    loadedPumps.add(pumpCode);
    persistCache();
    busy = false;
    renderDocumentsSection(section, "Documentos actualizados.");
  } catch (error) {
    busy = false;
    renderDocumentsSection(section, error.message || "No se pudieron cargar los documentos.", true);
  }
}

async function uploadDocument(event, section) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || busy) return;

  const validationError = validateFile(file);
  if (validationError) {
    renderDocumentsSection(section, validationError, true);
    return;
  }

  const pumpCode = section.dataset.pumpCode;
  const category = String(section.querySelector("#documentCategory")?.value || "Otro");
  const description = String(section.querySelector("#documentDescription")?.value || "").trim().slice(0, 240);
  setBusy(section, true, `Subiendo ${file.name}...`);

  try {
    const response = await requestFlow({
      action: "upload",
      pumpCode,
      pumpName: section.dataset.pumpName,
      folderName: section.dataset.folderName || GLOBAL_FOLDER_NAME,
      fileName: sanitizeFileName(file.name),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      category,
      description,
      contentBase64: await fileToBase64(file),
    });

    const uploaded = normalizeDocument(response?.document || response?.file || response);
    if (uploaded.id && uploaded.name) {
      const current = documentsByPump.get(pumpCode) || [];
      documentsByPump.set(pumpCode, [uploaded, ...current.filter((item) => item.id !== uploaded.id)]);
      persistCache();
    } else {
      loadedPumps.delete(pumpCode);
    }

    busy = false;
    renderDocumentsSection(section, "Documento guardado en SharePoint.");
    void loadDocuments(pumpCode, section, { refresh: true });
  } catch (error) {
    busy = false;
    renderDocumentsSection(section, error.message || "No se pudo subir el documento.", true);
  }
}

async function deleteDocument(documentId, section) {
  if (!documentId || busy) return;
  const pumpCode = section.dataset.pumpCode;
  const document = (documentsByPump.get(pumpCode) || []).find((item) => item.id === documentId);
  if (!window.confirm(`Eliminar ${document?.name || "este documento"} de SharePoint?`)) return;

  setBusy(section, true, "Eliminando documento...");
  try {
    await requestFlow({
      action: "delete",
      pumpCode,
      folderName: section.dataset.folderName || GLOBAL_FOLDER_NAME,
      fileId: documentId,
    });
    documentsByPump.set(
      pumpCode,
      (documentsByPump.get(pumpCode) || []).filter((item) => item.id !== documentId),
    );
    persistCache();
    busy = false;
    renderDocumentsSection(section, "Documento eliminado de SharePoint.");
  } catch (error) {
    busy = false;
    renderDocumentsSection(section, error.message || "No se pudo eliminar el documento.", true);
  }
}

function setBusy(section, value, message) {
  busy = value;
  renderDocumentsSection(section, message);
}

async function requestFlow(payload) {
  const response = await fetch(getFlowUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "omit",
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

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || `Power Automate devolvió el código ${response.status}.`);
  }

  return data;
}

function validateFile(file) {
  const extension = fileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(extension)) return "Tipo de archivo no admitido.";
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > MAX_FILE_SIZE) return "El archivo supera el límite de 20 MB.";
  return "";
}

function normalizeDocuments(documents) {
  return (Array.isArray(documents) ? documents : [])
    .map(normalizeDocument)
    .filter((document) => document.id && document.name)
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
}

function normalizeDocument(document) {
  const name = String(document?.name || document?.fileName || document?.Name || "").trim();
  return {
    id: String(document?.id || document?.fileId || document?.Identifier || document?.identifier || "").trim(),
    name,
    extension: fileExtension(name).toUpperCase() || "DOC",
    url: safeUrl(document?.url || document?.webUrl || document?.link || document?.LinkingUri),
    mimeType: String(document?.mimeType || document?.contentType || "").trim(),
    size: Number(document?.size || document?.length || 0) || 0,
    category: String(document?.category || document?.documentType || "Otro").trim() || "Otro",
    description: String(document?.description || "").trim().slice(0, 240),
    uploadedAt: String(document?.uploadedAt || document?.modified || document?.Modified || "").trim(),
  };
}

function getAgentContext() {
  const documents = documentsByPump.get(GLOBAL_CODE) || [];
  return documents.slice(0, 30).map((document) => ({
    sharePointId: document.id,
    name: document.name,
    category: document.category,
    description: document.description,
    mimeType: document.mimeType,
    size: document.size,
    uploadedAt: document.uploadedAt,
    url: document.url,
  }));
}

function loadCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return new Map(
      Object.entries(parsed).map(([pumpCode, documents]) => [pumpCode, normalizeDocuments(documents)]),
    );
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return new Map();
  }
}

function persistCache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(documentsByPump)));
}

function getFlowUrl() {
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

function safeUrl(value) {
  const url = String(value || "").trim();
  return isSecureUrl(url) ? url : "";
}

function sanitizeFolderName(value) {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .slice(0, 80) || "SIN-CODIGO";
}

function sanitizeFileName(value) {
  return String(value || "documento")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .slice(0, 180) || "documento";
}

function fileExtension(value) {
  const match = String(value || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "").split(",").at(-1) || ""), { once: true });
    reader.addEventListener("error", () => reject(new Error("No se pudo leer el archivo.")), { once: true });
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
