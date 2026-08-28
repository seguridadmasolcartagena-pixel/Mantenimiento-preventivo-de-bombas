import { buildPredictiveContext } from "./predictive-engine.js";
import { mountPredictiveChat } from "./predictive-chat.js?v=20260824-polished-chat";

const STORAGE_KEY = "gestor-bombas-v3";
const VIEWDATA_STORAGE_KEY = "gestor-bombas-viewdata-v1";
const PLANT_NOTES_STORAGE_KEY = "gestor-bombas-plant-notes-v1";
const PLANT_NOTES_AUTHOR_KEY = "gestor-bombas-plant-notes-author-v1";
const LOCAL_UPDATED_AT_KEY = "gestor-bombas-local-updated-at-v1";
const SHAREPOINT_FLOW_URL_KEY = "gestor-bombas-sharepoint-flow-url";
const SHAREPOINT_CONFIG_SAVE_URL_KEY = "gestor-bombas-config-save-flow-url";
const SHAREPOINT_CONFIG_LOAD_URL_KEY = "gestor-bombas-config-load-flow-url";
const DEFAULT_SHAREPOINT_FLOW_URL = "https://default65afa47b9e4e4ad28cfe30d4118f06.2e.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/15/workflows/95bc65b247164e0a804736dc195482c9/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8PRtUuxOM1R2WhMXrnYmkGHdTiIMxO8i7exY-jREaNY";
const DEFAULT_CONFIG_SAVE_FLOW_URL = "https://default65afa47b9e4e4ad28cfe30d4118f06.2e.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/17/workflows/700af3db16a142d5a2799fc8d21c5d41/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lua5kSvn1VtD5lRZgHNkv6e9zpkWd6oieNrbJMx6xO8";
const DEFAULT_CONFIG_LOAD_FLOW_URL = "https://default65afa47b9e4e4ad28cfe30d4118f06.2e.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/29/workflows/d6a6f47846c4459c82242e000ac1c256/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3sYKAXENMKBE6W-Mw8v59t_lryukYAWg2DtW-DFYPVQ";
const FILTER_STATUSES = ["Todas", "Operativa", "Aviso", "Alarma", "Mantenimiento", "Parada"];
const MANUAL_STATUSES = ["Operativa", "Mantenimiento", "Parada"];
const PUMP_TYPES = ["Centrífuga", "Pistón", "Engranajes", "Tornillo", "Lóbulos", "Diafragma", "Otra"];
const STANDARD_MEASUREMENT_POINTS = ["B-LA", "B-LOA", "M-LA", "M-LOA"];
const PISTON_MEASUREMENT_POINTS = ["M-LA", "M-LOA", "R", "A", "B"];
const MEASUREMENT_POINTS = [...new Set([...STANDARD_MEASUREMENT_POINTS, ...PISTON_MEASUREMENT_POINTS, "M-AX"])];
const MOTOR_MEASUREMENT_POINTS = new Set(["M-LA", "M-LOA", "M-AX"]);
const MAX_PLANT_NOTES = 100;
const POINT_COLORS = {
  "B-LA": "#0f766e",
  "B-LOA": "#2563eb",
  "M-LA": "#a16207",
  "M-LOA": "#b42318",
  R: "#7c3aed",
  A: "#0891b2",
  B: "#be185d",
  "M-AX": "#475569",
};

const demoPumps = [
  {
    id: crypto.randomUUID(),
    code: "P-101A",
    name: "Bomba carga biodiesel",
    area: "Proceso",
    status: "Operativa",
    measurements: [
      measurement("2026-07-01", "B-LA", 2.4),
      measurement("2026-07-01", "B-LOA", 2.1),
      measurement("2026-07-01", "M-LA", 1.8),
      measurement("2026-07-01", "M-LOA", 1.9),
      measurement("2026-07-08", "B-LA", 2.7),
      measurement("2026-07-08", "B-LOA", 2.3),
      measurement("2026-07-08", "M-LA", 2.0),
      measurement("2026-07-08", "M-LOA", 2.1),
      measurement("2026-07-15", "B-LA", 3.0),
      measurement("2026-07-15", "B-LOA", 2.6),
      measurement("2026-07-15", "M-LA", 2.2),
      measurement("2026-07-15", "M-LOA", 2.3),
      measurement("2026-07-20", "B-LA", 3.2),
      measurement("2026-07-20", "B-LOA", 2.8),
      measurement("2026-07-20", "M-LA", 2.4),
      measurement("2026-07-20", "M-LOA", 2.5),
    ],
    incidents: [
      {
        id: crypto.randomUUID(),
        date: "2026-07-16",
        severity: "Leve",
        title: "Ruido puntual en arranque",
        description: "Operario informa de ruido breve al arrancar. Sin parada.",
      },
    ],
  },
  {
    id: crypto.randomUUID(),
    code: "P-204B",
    name: "Recirculacion tanque intermedio",
    area: "Tanques",
    status: "Aviso",
    measurements: [
      measurement("2026-07-02", "B-LA", 3.2),
      measurement("2026-07-02", "B-LOA", 2.9),
      measurement("2026-07-02", "M-LA", 2.4),
      measurement("2026-07-02", "M-LOA", 2.5),
      measurement("2026-07-09", "B-LA", 4.1),
      measurement("2026-07-09", "B-LOA", 3.5),
      measurement("2026-07-09", "M-LA", 2.8),
      measurement("2026-07-09", "M-LOA", 2.9),
      measurement("2026-07-18", "B-LA", 4.9),
      measurement("2026-07-18", "B-LOA", 4.2),
      measurement("2026-07-18", "M-LA", 3.1),
      measurement("2026-07-18", "M-LOA", 3.2),
    ],
    incidents: [],
  },
  {
    id: crypto.randomUUID(),
    code: "P-330C",
    name: "Transferencia a expedicion",
    area: "Expedicion",
    status: "Parada",
    measurements: [
      measurement("2026-07-03", "B-LA", 4.8),
      measurement("2026-07-03", "B-LOA", 4.5),
      measurement("2026-07-03", "M-LA", 5.0),
      measurement("2026-07-03", "M-LOA", 5.2),
      measurement("2026-07-11", "B-LA", 6.4),
      measurement("2026-07-11", "B-LOA", 6.0),
      measurement("2026-07-11", "M-LA", 6.8),
      measurement("2026-07-11", "M-LOA", 7.1),
    ],
    incidents: [
      {
        id: crypto.randomUUID(),
        date: "2026-07-17",
        severity: "Alta",
        title: "Bomba parada",
        description: "Equipo dejado fuera de servicio para revision de mantenimiento.",
      },
    ],
  },
  {
    id: crypto.randomUUID(),
    code: "P-118D",
    name: "Alimentacion reactor",
    area: "Proceso",
    status: "Operativa",
    measurements: [
      measurement("2026-07-01", "B-LA", 1.8),
      measurement("2026-07-01", "B-LOA", 1.6),
      measurement("2026-07-01", "M-LA", 1.7),
      measurement("2026-07-01", "M-LOA", 1.5),
      measurement("2026-07-12", "B-LA", 2.0),
      measurement("2026-07-12", "B-LOA", 1.7),
      measurement("2026-07-12", "M-LA", 1.9),
      measurement("2026-07-12", "M-LOA", 1.6),
      measurement("2026-07-20", "B-LA", 2.1),
      measurement("2026-07-20", "B-LOA", 1.8),
      measurement("2026-07-20", "M-LA", 2.0),
      measurement("2026-07-20", "M-LOA", 1.7),
    ],
    incidents: [],
  },
];

function measurement(date, point, vibration) {
  return { id: crypto.randomUUID(), date, point, vibration, unit: "mm/s", source: "Fluke 805 FC" };
}

const state = {
  pumps: loadPumps(),
  viewDataBlocks: loadViewDataBlocks(),
  plantNotes: loadPlantNotes(),
  selectedId: null,
  query: "",
  filter: "Todas",
  pendingDeleteId: null,
  pendingPumpResetId: null,
  maintenancePumpId: null,
  editingMaintenanceId: null,
  pendingMaintenanceDelete: null,
  pendingImportData: null,
  frequencyBand: "all",
  pendingHistoryReset: false,
  showFlowConfig: false,
  sharePointFlowUrl: loadSharePointFlowUrl(),
  configSaveFlowUrl: loadConfigSaveFlowUrl(),
  configLoadFlowUrl: loadConfigLoadFlowUrl(),
  importMessage: "",
};

const app = document.querySelector("#app");

function loadPumps() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return demoPumps.map(normalizePump);

  if (!localStorage.getItem(LOCAL_UPDATED_AT_KEY)) {
    localStorage.setItem(LOCAL_UPDATED_AT_KEY, new Date().toISOString());
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizePump) : demoPumps.map(normalizePump);
  } catch {
    return demoPumps.map(normalizePump);
  }
}

function normalizePump(pump) {
  return {
    id: pump.id ?? crypto.randomUUID(),
    code: pump.code ?? "",
    name: pump.name ?? "Bomba sin nombre",
    pumpType: normalizePumpType(pump.pumpType, pump.name),
    powerKw: parseOptionalNumber(pump.powerKw),
    area: pump.area ?? "Sin asignar",
    aviso: String(pump.aviso ?? "").trim() || "4",
    alarma: String(pump.alarma ?? "").trim() || "6",
    motorGroup: String(pump.motorGroup ?? "").trim(),
    hasAxialMeasurement: Boolean(pump.hasAxialMeasurement),
    hasVfd: Boolean(pump.hasVfd),
    lastFrequencyHz: parseOptionalNumber(pump.lastFrequencyHz),
    status: normalizeStatus(pump.status),
    measurements: Array.isArray(pump.measurements) ? pump.measurements.map(normalizeMeasurement) : [],
    maintenanceEvents: Array.isArray(pump.maintenanceEvents) ? pump.maintenanceEvents.map(normalizeMaintenanceEvent) : [],
    incidents: Array.isArray(pump.incidents) ? pump.incidents : [],
  };
}

function normalizeMeasurement(item) {
  return {
    id: item.id ?? crypto.randomUUID(),
    date: item.date ?? "",
    dateTime: item.dateTime || item.date || "",
    point: normalizeMeasurementPoint(item.point),
    vibration: Number(item.vibration) || 0,
    cfPlus: parseOptionalNumber(item.cfPlus),
    frequencyHz: parseOptionalNumber(item.frequencyHz),
    unit: item.unit || "mm/s",
    source: item.source || "Fluke 805 FC",
  };
}

function normalizeMaintenanceEvent(item) {
  return {
    id: item.id ?? crypto.randomUUID(),
    date: item.date ?? "",
    type: item.type || "Preventivo",
    technician: item.technician || "",
    description: item.description || "",
  };
}

function normalizePumpType(value, name = "") {
  const requested = String(value ?? "").trim();
  const match = PUMP_TYPES.find((type) => cleanKey(type) === cleanKey(requested));
  if (match) return match;
  return cleanKey(name).includes("piston") ? "Pistón" : "Otra";
}

function measurementPointsForPump(pump) {
  const base = normalizePumpType(pump.pumpType, pump.name) === "Pistón" ? PISTON_MEASUREMENT_POINTS : STANDARD_MEASUREMENT_POINTS;
  return pump.hasAxialMeasurement ? [...base, "M-AX"] : [...base];
}

function markLocalDataUpdated() {
  localStorage.setItem(LOCAL_UPDATED_AT_KEY, new Date().toISOString());
}

function savePumps({ markUpdated = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pumps));
  if (markUpdated) markLocalDataUpdated();
}

function loadViewDataBlocks() {
  const saved = localStorage.getItem(VIEWDATA_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveViewDataBlocks({ markUpdated = true } = {}) {
  localStorage.setItem(VIEWDATA_STORAGE_KEY, JSON.stringify(state.viewDataBlocks));
  if (markUpdated) markLocalDataUpdated();
}

function normalizePlantNote(note) {
  return {
    id: note?.id ?? crypto.randomUUID(),
    author: String(note?.author ?? "Operación").trim().slice(0, 60) || "Operación",
    text: String(note?.text ?? "").trim().slice(0, 500),
    createdAt: typeof note?.createdAt === "string" ? note.createdAt : new Date().toISOString(),
  };
}

function loadPlantNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLANT_NOTES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.map(normalizePlantNote).filter((note) => note.text).slice(0, MAX_PLANT_NOTES)
      : [];
  } catch {
    return [];
  }
}

function savePlantNotes({ markUpdated = true } = {}) {
  localStorage.setItem(PLANT_NOTES_STORAGE_KEY, JSON.stringify(state.plantNotes));
  if (markUpdated) markLocalDataUpdated();
}

function loadSharePointFlowUrl() {
  return DEFAULT_SHAREPOINT_FLOW_URL;
}

function saveSharePointFlowUrl(url) {
  state.sharePointFlowUrl = url.trim();
  localStorage.setItem(SHAREPOINT_FLOW_URL_KEY, state.sharePointFlowUrl);
}

function loadConfigSaveFlowUrl() {
  return DEFAULT_CONFIG_SAVE_FLOW_URL;
}

function loadConfigLoadFlowUrl() {
  return DEFAULT_CONFIG_LOAD_FLOW_URL;
}

function saveConfigSyncUrls(saveUrl, loadUrl) {
  state.configSaveFlowUrl = saveUrl.trim();
  state.configLoadFlowUrl = loadUrl.trim();
  localStorage.setItem(SHAREPOINT_CONFIG_SAVE_URL_KEY, state.configSaveFlowUrl);
  localStorage.setItem(SHAREPOINT_CONFIG_LOAD_URL_KEY, state.configLoadFlowUrl);
}

function selectedPump() {
  if (!state.selectedId && state.pumps.length) state.selectedId = state.pumps[0].id;
  return state.pumps.find((pump) => pump.id === state.selectedId) ?? null;
}

function filteredPumps() {
  return state.pumps
    .filter((pump) => {
      const query = state.query.trim().toLowerCase();
      const pumpStatus = calculatedPumpStatus(pump);
      const matchesQuery =
        !query ||
        pump.code.toLowerCase().includes(query) ||
        pump.name.toLowerCase().includes(query) ||
        pump.area.toLowerCase().includes(query);
      const matchesFilter = state.filter === "Todas" || pumpStatus === state.filter;
      return matchesQuery && matchesFilter;
    })
    .sort(comparePumpsAlphabetically);
}

function comparePumpsAlphabetically(a, b) {
  const byCode = a.code.localeCompare(b.code, "es", { numeric: true, sensitivity: "base" });
  if (byCode !== 0) return byCode;
  return a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" });
}

function latestMeasurement(pump) {
  return [...pump.measurements].sort(compareMeasurements).at(-1) ?? null;
}

function latestMeasurementsByPoint(pump) {
  const measurementPoints = measurementPointsForPump(pump);
  const latest = Object.fromEntries(measurementPoints.map((point) => [point, null]));
  for (const item of [...pump.measurements].sort(compareMeasurements)) {
    if (measurementPoints.includes(item.point)) latest[item.point] = item;
  }
  return latest;
}

function compareMeasurements(a, b) {
  const aDate = a.dateTime || a.date || "";
  const bDate = b.dateTime || b.date || "";
  return aDate.localeCompare(bDate);
}

function normalizeStatus(status) {
  if (status === "En observacion") return "Aviso";
  if (status === "Alarma") return "Alarma";
  if (status === "Aviso") return "Aviso";
  if (status === "Mantenimiento") return "Mantenimiento";
  if (status === "Parada") return "Parada";
  return "Operativa";
}

function calculatedPumpStatus(pump) {
  const baseStatus = normalizeStatus(pump.status);
  if (baseStatus === "Parada" || baseStatus === "Mantenimiento") return baseStatus;

  const latestByPoint = latestMeasurementsByPoint(pump);
  const latestValues = Object.values(latestByPoint)
    .filter(Boolean)
    .map((item) => Number(item.vibration))
    .filter((value) => Number.isFinite(value));
  const alarmThreshold = parseThreshold(pump.alarma);
  const warningThreshold = parseThreshold(pump.aviso);

  if (alarmThreshold !== null && latestValues.some((value) => value >= alarmThreshold)) return "Alarma";
  if (warningThreshold !== null && latestValues.some((value) => value >= warningThreshold)) return "Aviso";
  if (baseStatus === "Aviso" || baseStatus === "Alarma") return baseStatus;
  return "Operativa";
}

function pumpAlert(pump) {
  const status = calculatedPumpStatus(pump);
  if (status !== "Aviso" && status !== "Alarma") return null;

  const latestByPoint = latestMeasurementsByPoint(pump);
  const warningThreshold = parseThreshold(pump.aviso);
  const alarmThreshold = parseThreshold(pump.alarma);
  const triggeredPoints = measurementPointsForPump(pump).map((point) => {
    const item = latestByPoint[point];
    const value = Number(item?.vibration);
    if (!item || !Number.isFinite(value)) return null;

    if (alarmThreshold !== null && value >= alarmThreshold) {
      return { point, value, unit: item.unit, date: item.date, thresholdType: "Alarma", threshold: alarmThreshold };
    }
    if (warningThreshold !== null && value >= warningThreshold) {
      return { point, value, unit: item.unit, date: item.date, thresholdType: "Aviso", threshold: warningThreshold };
    }
    return null;
  }).filter(Boolean);

  if (!triggeredPoints.length) return null;

  return {
    id: pump.id,
    code: pump.code,
    name: pump.name,
    area: pump.area,
    status,
    aviso: pump.aviso ?? "",
    alarma: pump.alarma ?? "",
    triggeredPoints,
    highestValue: Math.max(...triggeredPoints.map((item) => Number(item.value))),
    latestDate: triggeredPoints.map((item) => item.date).sort().at(-1) || "",
  };
}

function currentAlerts() {
  return state.pumps.map(pumpAlert).filter(Boolean);
}

function statusClass(status) {
  if (status === "Operativa") return "ok";
  if (status === "Aviso") return "warn";
  if (status === "Alarma") return "alarm";
  if (status === "Mantenimiento") return "maintenance";
  return "stop";
}

function render() {
  const selected = selectedPump();
  const pumps = filteredPumps();
  const counts = Object.fromEntries(
    FILTER_STATUSES.map((status) => [
      status,
      status === "Todas" ? state.pumps.length : state.pumps.filter((pump) => calculatedPumpStatus(pump) === status).length,
    ]),
  );

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <img class="brand-logo" src="./assets/masol-cartagena-biofuel.png" alt="Masol Cartagena Biofuel" />
          <div>
            <h1>Mantenimiento preventivo de las bombas de la planta</h1>
            <p>Historial e incidencias</p>
          </div>
        </div>
        <nav class="nav-section" aria-label="Filtros por estado">
          ${FILTER_STATUSES
            .map(
              (status) => `
                <button class="nav-button ${state.filter === status ? "active" : ""}" data-filter="${status}">
                  <span>${status}</span>
                  <span class="nav-count">${counts[status]}</span>
                </button>
              `,
            )
            .join("")}
        </nav>
        ${renderPlantNotesBoard()}
      </aside>

      <main class="main">
        <section class="topbar">
          <div>
            <p class="eyebrow">Fluke 805 FC</p>
            <h2>Historial de vibraciones</h2>
            <p>Importa las medidas del equipo, registra incidencias de operacion y consulta la evolucion de cada bomba desde su ficha.</p>
          </div>
          <div class="toolbar">
            <input id="measureFile" type="file" accept=".xlsx,.xls,.xlsm" hidden />
            <button class="button secondary" id="importMeasures">Importar Excel</button>
            <button class="button secondary" id="downloadHistory">Descargar Excel maestro</button>
            <button class="button" id="addPump">+ Nueva bomba</button>
            <details class="overflow-menu">
              <summary aria-label="Mas opciones" title="Mas opciones">•••</summary>
              <div class="overflow-menu-panel">
                <button type="button" id="resetHistory">Resetear historial</button>
              </div>
            </details>
          </div>
        </section>
        ${state.importMessage ? `<div class="import-message">${escapeHtml(state.importMessage)}</div>` : ""}

        <section class="workspace">
          <div class="panel">
            <div class="panel-header">
              <h3>Bombas</h3>
              <span class="tag">${pumps.length} visibles</span>
            </div>
            <div class="search-row">
              <input class="field" id="search" type="search" placeholder="Buscar bomba, area o codigo" value="${escapeHtml(state.query)}" />
              <select class="field" id="statusFilter">
                ${FILTER_STATUSES
                  .map((status) => `<option value="${status}" ${state.filter === status ? "selected" : ""}>${status}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="pump-list">
              ${
                pumps.length
                  ? pumps.map(renderPumpRow).join("")
                  : `<div class="empty-state"><div><strong>No hay bombas con ese filtro</strong>Importa medidas o crea una bomba nueva.</div></div>`
              }
            </div>
          </div>

          <div class="panel detail" id="pumpDetail">
            ${
              selected
                ? renderDetail(selected)
                : `<div class="empty-state"><div><strong>No hay bombas registradas</strong>Importa un archivo o crea la primera bomba.</div></div>`
            }
          </div>
        </section>
      </main>
    </div>
    ${renderDeleteModal()}
    ${renderResetPumpModal()}
    ${renderMaintenanceModal()}
    ${renderDeleteMaintenanceModal()}
    ${renderImportConditionsModal()}
    ${renderResetHistoryModal()}
    <div class="toast" id="toast"></div>
  `;

  bindEvents();
}

function renderPumpRow(pump) {
  const latest = latestMeasurement(pump);
  const pumpStatus = calculatedPumpStatus(pump);
  const status = statusClass(pumpStatus);

  return `
    <button class="pump-row ${pump.id === state.selectedId ? "active" : ""}" data-select="${pump.id}">
      <div>
        <div class="pump-title">
          <span class="pump-code">${escapeHtml(pump.code)}</span>
          <span class="pump-name">${escapeHtml(pump.name)}</span>
        </div>
        <div class="pump-meta">
          <span class="tag">${escapeHtml(pump.area)}</span>
          <span class="tag ${status}">${escapeHtml(pumpStatus)}</span>
          <span class="tag">${latest ? `${latest.vibration} ${latest.unit}` : "sin medidas"}</span>
          <span class="tag">${pump.incidents.length} incid.</span>
          <span class="tag">${pump.maintenanceEvents.length} mant.</span>
          <span class="tag">${escapeHtml(pump.pumpType)}</span>
          ${pump.powerKw === null ? "" : `<span class="tag">${pump.powerKw} kW</span>`}
          ${pump.hasVfd ? `<span class="tag">Variador</span>` : ""}
          ${pump.hasAxialMeasurement ? `<span class="tag">M-AX</span>` : ""}
          ${pump.motorGroup ? `<span class="tag">Motor ${escapeHtml(pump.motorGroup)}</span>` : ""}
        </div>
      </div>
      <span class="status-dot ${status}" aria-hidden="true"></span>
    </button>
  `;
}

function renderPlantNotesBoard() {
  const notes = [...state.plantNotes]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_PLANT_NOTES);
  const author = localStorage.getItem(PLANT_NOTES_AUTHOR_KEY) || "";

  return `
    <section class="plant-notes-board" aria-label="Tablón de notas de planta">
      <div class="plant-notes-header">
        <div>
          <h2>Tablón de planta</h2>
          <span>Información entre turnos</span>
        </div>
        <span class="plant-notes-count">${notes.length}</span>
      </div>
      <form class="plant-note-form" id="plantNoteForm">
        <input name="author" maxlength="60" value="${escapeHtml(author)}" placeholder="Nombre o turno" aria-label="Autor de la nota" required />
        <textarea name="text" maxlength="500" rows="3" placeholder="Escribe una nota para el siguiente turno" aria-label="Texto de la nota" required></textarea>
        <button type="submit">Publicar nota</button>
      </form>
      <div class="plant-notes-list" aria-live="polite">
        ${
          notes.length
            ? notes.map((note) => `
                <article class="plant-note">
                  <p>${escapeHtml(note.text)}</p>
                  <footer>
                    <strong>${escapeHtml(note.author)}</strong>
                    <time datetime="${escapeHtml(note.createdAt)}">${escapeHtml(formatPlantNoteDate(note.createdAt))}</time>
                  </footer>
                </article>
              `).join("")
            : `<p class="plant-notes-empty">Todavía no hay notas compartidas.</p>`
        }
      </div>
    </section>
  `;
}

function formatPlantNoteDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderDetail(pump) {
  const pumpStatus = calculatedPumpStatus(pump);
  const status = statusClass(pumpStatus);
  const latest = latestMeasurement(pump);
  const latestByPoint = latestMeasurementsByPoint(pump);
  const measurementPoints = measurementPointsForPump(pump);
  const average = pump.measurements.length
    ? pump.measurements.reduce((sum, item) => sum + Number(item.vibration), 0) / pump.measurements.length
    : 0;
  const max = pump.measurements.length ? Math.max(...pump.measurements.map((item) => Number(item.vibration))) : 0;

  return `
    <div class="panel-header">
      <h3>${escapeHtml(pump.code)} · ${escapeHtml(pump.name)}</h3>
      <span class="tag ${status}">${escapeHtml(pumpStatus)}</span>
    </div>
    <div class="detail-body">
      <div class="metrics">
        <div class="metric"><span>Ultima vibracion</span><strong>${latest ? `${latest.vibration} ${latest.unit}` : "-"}</strong></div>
        <div class="metric"><span>Promedio</span><strong>${average ? average.toFixed(2) : "-"} mm/s</strong></div>
        <div class="metric"><span>Maximo</span><strong>${max ? max.toFixed(2) : "-"} mm/s</strong></div>
      </div>

      <section class="latest-round">
        <div class="section-heading">
          <h4>Ultima ronda</h4>
          <span>${measurementPoints.length} puntos configurados</span>
        </div>
        <div class="point-grid">
          ${measurementPoints.map((point) => renderPointSummary(point, latestByPoint[point])).join("")}
        </div>
      </section>

      <form id="pumpForm" class="form-grid compact-form">
        <label>
          Codigo
          <input class="field" name="code" value="${escapeHtml(pump.code)}" required />
        </label>
        <label>
          Area
          <input class="field" name="area" value="${escapeHtml(pump.area)}" required />
        </label>
        <label class="full">
          Nombre / descripción
          <input class="field" name="name" value="${escapeHtml(pump.name)}" required />
        </label>
        <label>
          Tipo de bomba
          <select class="field" name="pumpType">
            ${PUMP_TYPES.map((type) => `<option value="${type}" ${pump.pumpType === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </label>
        <label>
          Potencia
          <div class="field-with-unit">
            <input class="field" name="powerKw" type="number" step="0.01" min="0" inputmode="decimal" value="${escapeHtml(pump.powerKw ?? "")}" placeholder="Ej. 15" />
            <span>kW</span>
          </div>
        </label>
        <label>
          Aviso (mm/s RMS)
          <input class="field" name="aviso" type="number" step="0.01" min="0" inputmode="decimal" value="${escapeHtml(pump.aviso ?? "")}" />
        </label>
        <label>
          Alarma (mm/s RMS)
          <input class="field" name="alarma" type="number" step="0.01" min="0" inputmode="decimal" value="${escapeHtml(pump.alarma ?? "")}" />
        </label>
        <label class="full">
          Grupo de motor compartido
          <input class="field" name="motorGroup" list="motorGroupOptions" value="${escapeHtml(pump.motorGroup ?? "")}" />
          <small>Usa exactamente el mismo grupo en todas las bombas que compartan este motor.</small>
          <datalist id="motorGroupOptions">
            ${[...new Set(state.pumps.map((item) => item.motorGroup).filter(Boolean))]
              .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }))
              .map((group) => `<option value="${escapeHtml(group)}"></option>`)
              .join("")}
          </datalist>
        </label>
        <label>
          Estado operativo
          <select class="field" name="status">
            ${MANUAL_STATUSES
              .map((statusOption) => `<option value="${statusOption}" ${normalizeStatus(pump.status) === statusOption ? "selected" : ""}>${statusOption}</option>`)
              .join("")}
          </select>
        </label>
        <label class="checkbox-field">
          <input name="hasVfd" type="checkbox" ${pump.hasVfd ? "checked" : ""} />
          <span>La bomba dispone de variador de frecuencia</span>
        </label>
        <label class="checkbox-field">
          <input name="hasAxialMeasurement" type="checkbox" ${pump.hasAxialMeasurement ? "checked" : ""} />
          <span>Añadir medida axial del motor M-AX</span>
        </label>
        <div class="status-explain">
          Estado actual: <strong>${escapeHtml(pumpStatus)}</strong>. Aviso y Alarma se calculan con los puntos configurados para esta bomba.
        </div>
        <div class="detail-actions">
          <button class="button danger" type="button" id="deletePump">Eliminar bomba</button>
          <button class="button secondary" type="button" id="resetPump">Resetear bomba</button>
          <button class="button" type="submit">Guardar</button>
        </div>
      </form>

      <section class="history-section">
        <div class="section-heading">
          <div>
            <h4>Grafica de vibracion</h4>
            <span>${measurementPoints.join(" · ")}</span>
          </div>
          <div class="chart-actions">
            ${renderFrequencyFilter(pump)}
            <button class="button secondary button-small" type="button" id="registerMaintenance">Registrar mantenimiento</button>
          </div>
        </div>
        ${renderChart(pump, state.frequencyBand)}
      </section>

      <section class="history-section">
        <div class="section-heading">
          <h4>Evolucion de CF+</h4>
          <span>Indicador de condicion del rodamiento</span>
        </div>
        ${renderCfPlusChart(pump, state.frequencyBand)}
      </section>

      <section class="history-section">
        <div class="section-heading">
          <h4>Mantenimientos</h4>
          <span>${pump.maintenanceEvents.length} registrados</span>
        </div>
        ${renderMaintenanceEvents(pump)}
      </section>

      <section class="history-section">
        <div class="section-heading">
          <h4>Historial de medidas</h4>
          <span>Importadas del Fluke</span>
        </div>
        ${renderMeasurementsTable(pump.measurements)}
      </section>

      <section class="history-section">
        <div class="section-heading">
          <h4>Incidencias</h4>
          <span>Registro manual del operario</span>
        </div>
        ${renderIncidentForm()}
        ${renderIncidents(pump.incidents)}
      </section>
    </div>
  `;
}

function renderPointSummary(point, item) {
  return `
    <div class="point-summary" style="--point-color: ${POINT_COLORS[point]}">
      <span>${point}</span>
      <strong>${item ? `${item.vibration} ${escapeHtml(item.unit)}` : "-"}</strong>
      <small>${item ? `${formatDate(item.date)} · ${item.frequencyHz === null ? "sin Hz" : `${item.frequencyHz} Hz`}` : "sin medida"}</small>
      <small>${item?.cfPlus === null || item?.cfPlus === undefined ? "CF+ no indicado" : `CF+ ${item.cfPlus}`}</small>
    </div>
  `;
}

function frequencyBandKey(value) {
  const frequency = parseOptionalNumber(value);
  if (frequency === null) return "unknown";
  const start = Math.floor(frequency / 5) * 5;
  return `${start}-${start + 5}`;
}

function frequencyBands(pump) {
  const bands = new Set(
    pump.measurements
      .map((item) => frequencyBandKey(item.frequencyHz))
      .filter((band) => band !== "unknown"),
  );
  return [...bands].sort((a, b) => Number(a.split("-")[0]) - Number(b.split("-")[0]));
}

function renderFrequencyFilter(pump) {
  const bands = frequencyBands(pump);
  const hasUnknown = pump.measurements.some((item) => parseOptionalNumber(item.frequencyHz) === null);
  if (!bands.length && !hasUnknown) return "";

  return `
    <label class="frequency-filter">
      <span>Frecuencia</span>
      <select class="field" id="frequencyFilter">
        <option value="all" ${state.frequencyBand === "all" ? "selected" : ""}>Todas</option>
        ${bands
          .map((band) => {
            const [start, end] = band.split("-");
            return `<option value="${band}" ${state.frequencyBand === band ? "selected" : ""}>${start}–${end} Hz</option>`;
          })
          .join("")}
        ${hasUnknown ? `<option value="unknown" ${state.frequencyBand === "unknown" ? "selected" : ""}>Sin frecuencia</option>` : ""}
      </select>
    </label>
  `;
}

function renderChart(pump, selectedBand = "all") {
  const measurementPoints = measurementPointsForPump(pump);
  const allItems = [...pump.measurements]
    .map(normalizeMeasurement)
    .filter((item) => measurementPoints.includes(item.point))
    .sort((a, b) => a.date.localeCompare(b.date));
  const items = allItems.filter((item) => selectedBand === "all" || frequencyBandKey(item.frequencyHz) === selectedBand);
  const maintenanceEvents = [...pump.maintenanceEvents]
    .map(normalizeMaintenanceEvent)
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!items.length && selectedBand !== "all") {
    return `<div class="empty-inline">No hay medidas en el rango de frecuencia seleccionado.</div>`;
  }
  if (!items.length && !maintenanceEvents.length) {
    return `<div class="empty-inline">Todavia no hay medidas para graficar.</div>`;
  }

  const width = 680;
  const height = 270;
  const pad = 58;
  const dates = [...new Set([...items.map((item) => item.date), ...maintenanceEvents.map((item) => item.date)])]
    .sort()
    .slice(-10);
  const visibleItems = items.filter((item) => dates.includes(item.date));
  const visibleMaintenance = maintenanceEvents.filter((item) => dates.includes(item.date));
  const thresholds = [
    { key: "aviso", label: "Aviso", value: parseThreshold(pump.aviso), color: "#d97706" },
    { key: "alarma", label: "Alarma", value: parseThreshold(pump.alarma), color: "#b42318" },
  ].filter((threshold) => threshold.value !== null);
  const maxValue = Math.max(1, ...items.map((item) => Number(item.vibration)), ...thresholds.map((item) => item.value));
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = (maxValue * (4 - index)) / 4;
    return { value, y: pad + (index * (height - pad * 2)) / 4 };
  });
  const formatVibrationAxisValue = (value) => (maxValue <= 10 ? value.toFixed(2) : value.toFixed(1));
  const xForDate = (date) => {
    const index = dates.indexOf(date);
    return dates.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (dates.length - 1);
  };
  const yForValue = (value) => height - pad - (Number(value) / maxValue) * (height - pad * 2);
  const thresholdLines = thresholds.map((threshold) => ({ ...threshold, y: yForValue(threshold.value) }));
  const maintenanceMarkers = visibleMaintenance.map((item) => ({ ...item, x: xForDate(item.date) }));

  const series = measurementPoints.map((point) => {
    const pointItems = visibleItems.filter((item) => item.point === point);
    const chartPoints = pointItems.map((item) => ({ ...item, x: xForDate(item.date), y: yForValue(item.vibration) }));
    const path = chartPoints.map((item, index) => `${index ? "L" : "M"} ${item.x.toFixed(1)} ${item.y.toFixed(1)}`).join(" ");
    return { point, chartPoints, path };
  });

  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafica de vibracion">
      ${yTicks
        .map(
          (tick) => `
            <g class="axis-tick">
              <line x1="${pad}" y1="${tick.y.toFixed(1)}" x2="${width - pad}" y2="${tick.y.toFixed(1)}" style="stroke: #e1e6df; stroke-width: 1" />
              <text x="${pad - 7}" y="${(tick.y + 4).toFixed(1)}" text-anchor="end">${formatVibrationAxisValue(tick.value)}</text>
            </g>
          `,
        )
        .join("")}
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" />
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" />
      ${maintenanceMarkers
        .map(
          (event) => `
            <g class="maintenance-marker">
              <title>${escapeHtml(`${formatDate(event.date)} · ${event.type} · ${event.description || "Sin descripcion"}`)}</title>
              <line x1="${event.x.toFixed(1)}" y1="${pad}" x2="${event.x.toFixed(1)}" y2="${height - pad}" />
              <rect x="${(event.x - 8).toFixed(1)}" y="${pad + 4}" width="16" height="16" rx="3" />
              <text x="${event.x.toFixed(1)}" y="${pad + 16}" text-anchor="middle">M</text>
            </g>
          `,
        )
        .join("")}
      ${thresholdLines
        .map(
          (threshold, index) => `
            <g class="threshold-line ${threshold.key}">
              <line x1="${pad}" y1="${threshold.y.toFixed(1)}" x2="${width - pad}" y2="${threshold.y.toFixed(1)}" style="stroke: ${threshold.color}" />
              <text x="${width - pad - 6}" y="${(threshold.y - 6 - index * 2).toFixed(1)}" text-anchor="end" style="fill: ${threshold.color}">
                ${threshold.label} ${threshold.value}
              </text>
            </g>
          `,
        )
        .join("")}
      ${series
        .map(
          (line) => `
            <path d="${line.path}" style="stroke: ${POINT_COLORS[line.point]}" />
            ${line.chartPoints
              .map(
                (point) => `
                  <g>
                    <title>${escapeHtml(`${formatDate(point.date)} · ${point.point} · ${point.vibration} ${point.unit} · ${point.frequencyHz === null ? "Frecuencia no indicada" : `${point.frequencyHz} Hz`}`)}</title>
                    <circle cx="${point.x}" cy="${point.y}" r="4.5" style="stroke: ${POINT_COLORS[line.point]}" />
                  </g>
                `,
              )
              .join("")}
          `,
        )
        .join("")}
      ${measurementPoints
        .map(
          (point, index) => `
            <g class="chart-legend">
              <rect x="${pad + index * ((width - pad * 2) / measurementPoints.length)}" y="12" width="10" height="10" rx="2" style="fill: ${POINT_COLORS[point]}" />
              <text x="${pad + 16 + index * ((width - pad * 2) / measurementPoints.length)}" y="22">${point}</text>
            </g>
          `,
        )
        .join("")}
      <g class="chart-legend maintenance-legend">
        <rect x="${pad}" y="34" width="10" height="10" rx="2" />
        <text x="${pad + 16}" y="44">Mantenimiento</text>
      </g>
      <text x="${pad}" y="${height - 8}">${escapeHtml(dates[0])}</text>
      <text x="${width - pad}" y="${height - 8}" text-anchor="end">${escapeHtml(dates.at(-1))}</text>
    </svg>
  `;
}

function renderCfPlusChart(pump, selectedBand = "all") {
  const measurementPoints = measurementPointsForPump(pump);
  const items = pump.measurements
    .map(normalizeMeasurement)
    .filter(
      (item) =>
        measurementPoints.includes(item.point) &&
        item.cfPlus !== null &&
        (selectedBand === "all" || frequencyBandKey(item.frequencyHz) === selectedBand),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!items.length) {
    return `<div class="empty-inline">No hay valores CF+ disponibles${selectedBand === "all" ? "." : " en el rango de frecuencia seleccionado."}</div>`;
  }

  const width = 680;
  const height = 250;
  const pad = 38;
  const dates = [...new Set(items.map((item) => item.date))].slice(-10);
  const visibleItems = items.filter((item) => dates.includes(item.date));
  const maxCfPlus = Math.max(1, ...visibleItems.map((item) => item.cfPlus));
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = (maxCfPlus * (4 - index)) / 4;
    return { value, y: pad + (index * (height - pad * 2)) / 4 };
  });
  const formatCfAxisValue = (value) => (maxCfPlus <= 10 ? value.toFixed(2) : value.toFixed(1));
  const xForDate = (date) => {
    const index = dates.indexOf(date);
    return dates.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (dates.length - 1);
  };
  const yForValue = (value) => height - pad - (value / maxCfPlus) * (height - pad * 2);
  const series = measurementPoints.map((point) => {
    const chartPoints = visibleItems
      .filter((item) => item.point === point)
      .map((item) => ({ ...item, x: xForDate(item.date), y: yForValue(item.cfPlus) }));
    const path = chartPoints.map((item, index) => `${index ? "L" : "M"} ${item.x.toFixed(1)} ${item.y.toFixed(1)}`).join(" ");
    return { point, chartPoints, path };
  });

  return `
    <svg class="chart cfplus-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolucion de CFPlus">
      ${yTicks
        .map(
          (tick) => `
            <g class="axis-tick">
              <line x1="${pad}" y1="${tick.y.toFixed(1)}" x2="${width - pad}" y2="${tick.y.toFixed(1)}" style="stroke: #e1e6df; stroke-width: 1" />
              <text x="${pad - 7}" y="${(tick.y + 4).toFixed(1)}" text-anchor="end">${formatCfAxisValue(tick.value)}</text>
            </g>
          `,
        )
        .join("")}
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" />
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" />
      ${series
        .map(
          (line) => `
            <path d="${line.path}" style="stroke: ${POINT_COLORS[line.point]}" />
            ${line.chartPoints
              .map(
                (point) => `
                  <g>
                    <title>${escapeHtml(`${formatDate(point.date)} · ${point.point} · CF+ ${point.cfPlus} · ${point.frequencyHz === null ? "Frecuencia no indicada" : `${point.frequencyHz} Hz`}`)}</title>
                    <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5" style="stroke: ${POINT_COLORS[line.point]}" />
                  </g>
                `,
              )
              .join("")}
          `,
        )
        .join("")}
      ${measurementPoints
        .map(
          (point, index) => `
            <g class="chart-legend">
              <rect x="${pad + index * ((width - pad * 2) / measurementPoints.length)}" y="12" width="10" height="10" rx="2" style="fill: ${POINT_COLORS[point]}" />
              <text x="${pad + 16 + index * ((width - pad * 2) / measurementPoints.length)}" y="22">${point}</text>
            </g>
          `,
        )
        .join("")}
      <text x="${pad + 4}" y="${pad - 9}">CF+</text>
      <text x="${pad}" y="${height - 9}">${escapeHtml(dates[0])}</text>
      <text x="${width - pad}" y="${height - 9}" text-anchor="end">${escapeHtml(dates.at(-1))}</text>
    </svg>
  `;
}

function renderMaintenanceEvents(pump) {
  const rows = [...pump.maintenanceEvents].map(normalizeMaintenanceEvent).sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) return `<div class="empty-inline">No hay mantenimientos registrados.</div>`;

  return `
    <div class="maintenance-list">
      ${rows
        .map(
          (item) => `
            <article class="maintenance-event">
              <div class="maintenance-date"><strong>${formatDate(item.date)}</strong><span>${escapeHtml(item.type)}</span></div>
              <div>
                <strong>${escapeHtml(item.description || "Mantenimiento registrado")}</strong>
                <p>${item.technician ? `Realizado por ${escapeHtml(item.technician)}` : "Responsable no indicado"}</p>
              </div>
              <div class="maintenance-actions">
                <button class="button secondary button-small" type="button" data-edit-maintenance="${item.id}">Editar</button>
                <button class="button danger button-small" type="button" data-delete-maintenance="${item.id}">Eliminar</button>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function parseThreshold(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function renderMeasurementsTable(measurements) {
  const rows = [...measurements].map(normalizeMeasurement).sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) return `<div class="empty-inline">Sin medidas importadas.</div>`;

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Punto</th>
            <th>Frecuencia</th>
            <th>Vibracion</th>
            <th>CF+</th>
            <th>Origen</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (item) => `
                <tr>
                  <td>${formatDate(item.date)}</td>
                  <td>${escapeHtml(item.point)}</td>
                  <td>${item.frequencyHz === null ? "No indicada" : `${item.frequencyHz} Hz`}</td>
                  <td><strong>${item.vibration} ${escapeHtml(item.unit)}</strong></td>
                  <td>${item.cfPlus === null ? "No indicado" : item.cfPlus}</td>
                  <td>${escapeHtml(item.source)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderIncidentForm() {
  return `
    <form id="incidentForm" class="incident-form">
      <input class="field" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required />
      <select class="field" name="severity">
        <option>Leve</option>
        <option>Media</option>
        <option>Alta</option>
      </select>
      <input class="field" name="title" placeholder="Titulo de la incidencia" required />
      <textarea class="field" name="description" placeholder="Descripcion de lo observado por el operario"></textarea>
      <button class="button" type="submit">Añadir incidencia</button>
    </form>
  `;
}

function renderDeleteModal() {
  if (!state.pendingDeleteId) return "";

  const pump = state.pumps.find((item) => item.id === state.pendingDeleteId);
  if (!pump) return "";

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
        <p class="eyebrow">Confirmacion</p>
        <h3 id="deleteTitle">¿Estás seguro de eliminar esta bomba?</h3>
        <p>Se eliminara <strong>${escapeHtml(pump.code)}</strong> junto con sus medidas, mantenimientos e incidencias guardadas en esta aplicacion.</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" id="cancelDelete">Cancelar</button>
          <button class="button danger" type="button" id="confirmDelete">Eliminar bomba</button>
        </div>
      </section>
    </div>
  `;
}

function renderResetPumpModal() {
  if (!state.pendingPumpResetId) return "";

  const pump = state.pumps.find((item) => item.id === state.pendingPumpResetId);
  if (!pump) return "";

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="resetPumpTitle">
        <p class="eyebrow">Confirmacion</p>
        <h3 id="resetPumpTitle">¿Estás seguro de resetear esta bomba?</h3>
        <p>Se limpiaran las medidas activas de <strong>${escapeHtml(pump.code)}</strong> para iniciar una nueva etapa de seguimiento. El historial maestro importado se conservara para analisis de tendencias.</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" id="cancelResetPump">Cancelar</button>
          <button class="button danger" type="button" id="confirmResetPump">Resetear bomba</button>
        </div>
      </section>
    </div>
  `;
}

function renderMaintenanceModal() {
  if (!state.maintenancePumpId) return "";

  const pump = state.pumps.find((item) => item.id === state.maintenancePumpId);
  if (!pump) return "";
  const maintenance = pump.maintenanceEvents.find((item) => item.id === state.editingMaintenanceId) ?? null;
  const selectedType = maintenance?.type || "Preventivo";

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="maintenanceTitle">
        <p class="eyebrow">Intervencion</p>
        <h3 id="maintenanceTitle">${maintenance ? "Editar mantenimiento" : "Registrar mantenimiento"}</h3>
        <p>El mantenimiento de <strong>${escapeHtml(pump.code)}</strong> quedara señalado en la grafica de vibracion.</p>
        <form id="maintenanceForm" class="maintenance-form">
          <label>
            Fecha
            <input class="field" name="date" type="date" value="${escapeHtml(maintenance?.date || new Date().toISOString().slice(0, 10))}" required />
          </label>
          <label>
            Tipo
            <select class="field" name="type">
              ${["Preventivo", "Correctivo", "Inspeccion", "Otro"]
                .map((type) => `<option ${selectedType === type ? "selected" : ""}>${type}</option>`)
                .join("")}
            </select>
          </label>
          <label class="full">
            Realizado por
            <input class="field" name="technician" value="${escapeHtml(maintenance?.technician || "")}" placeholder="Nombre o empresa (opcional)" />
          </label>
          <label class="full">
            Trabajo realizado
            <textarea class="field" name="description" placeholder="Describe brevemente la intervencion" required>${escapeHtml(maintenance?.description || "")}</textarea>
          </label>
          <div class="modal-actions full">
            <button class="button secondary" type="button" id="cancelMaintenance">Cancelar</button>
            <button class="button" type="submit">${maintenance ? "Guardar cambios" : "Registrar mantenimiento"}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderDeleteMaintenanceModal() {
  if (!state.pendingMaintenanceDelete) return "";
  const pump = state.pumps.find((item) => item.id === state.pendingMaintenanceDelete.pumpId);
  const maintenance = pump?.maintenanceEvents.find((item) => item.id === state.pendingMaintenanceDelete.maintenanceId);
  if (!pump || !maintenance) return "";

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="deleteMaintenanceTitle">
        <p class="eyebrow">Confirmacion</p>
        <h3 id="deleteMaintenanceTitle">¿Eliminar este mantenimiento?</h3>
        <p>Se eliminara el mantenimiento de <strong>${formatDate(maintenance.date)}</strong> registrado en <strong>${escapeHtml(pump.code)}</strong>.</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" id="cancelDeleteMaintenance">Cancelar</button>
          <button class="button danger" type="button" id="confirmDeleteMaintenance">Eliminar mantenimiento</button>
        </div>
      </section>
    </div>
  `;
}

function renderImportConditionsModal() {
  if (!state.pendingImportData) return "";

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="confirm-modal import-conditions-modal" role="dialog" aria-modal="true" aria-labelledby="importConditionsTitle">
        <p class="eyebrow">Condiciones de operacion</p>
        <h3 id="importConditionsTitle">Frecuencia durante la medicion</h3>
        <p>Indica qué bombas tienen variador y la frecuencia estable mantenida durante la ronda. El valor se aplicara a sus cuatro puntos.</p>
        <form id="importConditionsForm" class="import-conditions-form">
          <div class="condition-header"><span>Bomba</span><span>Variador</span><span>Frecuencia</span></div>
          ${state.pendingImportData.conditions
            .map(
              (condition, index) => `
                <div class="condition-row">
                  <strong>${escapeHtml(condition.code)}</strong>
                  <label class="toggle-field">
                    <input type="checkbox" name="vfd-${index}" data-frequency-toggle="${index}" ${condition.hasVfd ? "checked" : ""} />
                    <span>${condition.hasVfd ? "Sí" : "No"}</span>
                  </label>
                  <label class="frequency-entry">
                    <input class="field" name="frequency-${index}" data-frequency-input="${index}" type="number" min="1" max="100" step="0.1" inputmode="decimal" value="${condition.frequencyHz ?? ""}" ${condition.hasVfd ? "required" : "disabled"} />
                    <span>Hz</span>
                  </label>
                </div>
              `,
            )
            .join("")}
          <div class="modal-actions">
            <button class="button secondary" type="button" id="cancelImportConditions">Cancelar</button>
            <button class="button" type="submit">Continuar importacion</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderResetHistoryModal() {
  if (!state.pendingHistoryReset) return "";

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="resetHistoryTitle">
        <p class="eyebrow">Confirmacion</p>
        <h3 id="resetHistoryTitle">¿Estás seguro de resetear el historial?</h3>
        <p>Se borraran las medidas importadas y el historial de vibraciones guardado en esta aplicacion. Las bombas, avisos, alarmas, mantenimientos e incidencias se conservaran.</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" id="cancelResetHistory">Cancelar</button>
          <button class="button danger" type="button" id="confirmResetHistory">Resetear historial</button>
        </div>
      </section>
    </div>
  `;
}

function renderFlowConfigModal() {
  if (!state.showFlowConfig) return "";

  return `
    <div class="modal-backdrop" role="presentation" data-close-modal="flowConfig">
      <section class="confirm-modal flow-modal" role="dialog" aria-modal="true" aria-labelledby="flowTitle">
        <button class="modal-close" type="button" id="closeFlowConfig" aria-label="Cerrar configuracion">x</button>
        <p class="eyebrow">SharePoint</p>
        <h3 id="flowTitle">Configurar flujo de Power Automate</h3>
        <p>Pega las URL de los disparadores HTTP. La app puede subir el Excel maestro y sincronizar automaticamente los datos compartidos.</p>
        <form id="flowConfigForm" class="flow-form">
          <label>
            URL para subir Excel maestro
            <textarea class="field" name="flowUrl" placeholder="https://prod-...logic.azure.com/...">${escapeHtml(state.sharePointFlowUrl)}</textarea>
          </label>
          <label>
            URL para guardar datos compartidos
            <textarea class="field" name="configSaveFlowUrl" placeholder="https://prod-...logic.azure.com/...">${escapeHtml(state.configSaveFlowUrl)}</textarea>
          </label>
          <label>
            URL para cargar datos compartidos
            <textarea class="field" name="configLoadFlowUrl" placeholder="https://prod-...logic.azure.com/...">${escapeHtml(state.configLoadFlowUrl)}</textarea>
          </label>
          <div class="flow-tools">
            <input id="memoryJsonFile" type="file" accept=".json,application/json" hidden />
            <button class="button secondary" type="button" id="loadSharedNow">Cargar ahora desde SharePoint</button>
            <button class="button secondary" type="button" id="importMemoryJson">Importar memoria JSON</button>
          </div>
          <div class="modal-actions">
            <button class="button secondary" type="button" id="cancelFlowConfig">Cancelar</button>
            <button class="button" type="submit">Guardar conexion</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderIncidents(incidents) {
  const rows = [...incidents].sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) return `<div class="empty-inline">No hay incidencias registradas.</div>`;

  return `
    <div class="incident-list">
      ${rows
        .map(
          (item) => `
            <article class="incident">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.description || "Sin descripcion adicional.")}</p>
              </div>
              <div class="incident-meta">
                <span class="tag ${item.severity === "Alta" ? "stop" : item.severity === "Media" ? "warn" : ""}">${escapeHtml(item.severity)}</span>
                <span>${formatDate(item.date)}</span>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function bindEvents() {
  document.querySelector("#plantNoteForm")?.addEventListener("submit", addPlantNote);
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      selectPump(button.dataset.select);
    });
  });

  document.querySelector("#search")?.addEventListener("input", (event) => {
    const cursorPosition = event.target.selectionStart;
    state.query = event.target.value;
    render();
    const search = document.querySelector("#search");
    search?.focus();
    search?.setSelectionRange(cursorPosition, cursorPosition);
  });

  document.querySelector("#statusFilter")?.addEventListener("change", (event) => {
    state.filter = event.target.value;
    render();
  });

  document.querySelector("#addPump")?.addEventListener("click", addPump);
  document.querySelector("#deletePump")?.addEventListener("click", requestDeleteSelectedPump);
  document.querySelector("#resetPump")?.addEventListener("click", requestResetSelectedPump);
  document.querySelector("#registerMaintenance")?.addEventListener("click", requestMaintenance);
  document.querySelectorAll("[data-edit-maintenance]").forEach((button) => {
    button.addEventListener("click", () => requestEditMaintenance(button.dataset.editMaintenance));
  });
  document.querySelectorAll("[data-delete-maintenance]").forEach((button) => {
    button.addEventListener("click", () => requestDeleteMaintenance(button.dataset.deleteMaintenance));
  });
  document.querySelector("#cancelDelete")?.addEventListener("click", cancelDeletePump);
  document.querySelector("#confirmDelete")?.addEventListener("click", confirmDeletePump);
  document.querySelector("#cancelResetPump")?.addEventListener("click", cancelResetPump);
  document.querySelector("#confirmResetPump")?.addEventListener("click", confirmResetPump);
  document.querySelector("#cancelMaintenance")?.addEventListener("click", cancelMaintenance);
  document.querySelector("#maintenanceForm")?.addEventListener("submit", saveMaintenance);
  document.querySelector("#cancelDeleteMaintenance")?.addEventListener("click", cancelDeleteMaintenance);
  document.querySelector("#confirmDeleteMaintenance")?.addEventListener("click", confirmDeleteMaintenance);
  document.querySelector("#cancelImportConditions")?.addEventListener("click", cancelImportConditions);
  document.querySelector("#importConditionsForm")?.addEventListener("submit", completeMeasurementImport);
  document.querySelectorAll("[data-frequency-toggle]").forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const index = toggle.dataset.frequencyToggle;
      const input = document.querySelector(`[data-frequency-input="${index}"]`);
      const label = toggle.closest(".toggle-field")?.querySelector("span");
      if (input) {
        input.disabled = !toggle.checked;
        input.required = toggle.checked;
        if (toggle.checked) input.focus();
      }
      if (label) label.textContent = toggle.checked ? "Sí" : "No";
    });
  });
  document.querySelector("#resetHistory")?.addEventListener("click", requestResetHistory);
  document.querySelector("#cancelResetHistory")?.addEventListener("click", cancelResetHistory);
  document.querySelector("#confirmResetHistory")?.addEventListener("click", confirmResetHistory);
  document.querySelector("#pumpForm")?.addEventListener("submit", saveSelectedPump);
  document.querySelector("#incidentForm")?.addEventListener("submit", addIncident);
  document.querySelector("#importMeasures")?.addEventListener("click", () => document.querySelector("#measureFile")?.click());
  document.querySelector("#measureFile")?.addEventListener("change", importMeasurements);
  document.querySelector("#frequencyFilter")?.addEventListener("change", (event) => {
    state.frequencyBand = event.target.value;
    render();
  });
  document.querySelector("#downloadHistory")?.addEventListener("click", downloadHistoryExcel);
}

async function addPlantNote(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const author = String(form.get("author") ?? "").trim().slice(0, 60);
  const text = String(form.get("text") ?? "").trim().slice(0, 500);
  if (!author || !text) {
    showToast("Indica el autor y el texto de la nota.");
    return;
  }

  localStorage.setItem(PLANT_NOTES_AUTHOR_KEY, author);
  state.plantNotes = [normalizePlantNote({
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString(),
  }), ...state.plantNotes].slice(0, MAX_PLANT_NOTES);
  savePlantNotes();
  render();

  const shared = await syncSharedData();
  showToast(shared ? "Nota publicada en el tablón compartido." : "Nota guardada en este navegador; no se pudo sincronizar.");
}

function selectPump(id) {
  state.selectedId = id;
  state.frequencyBand = "all";
  render();
  window.requestAnimationFrame(() => {
    document.querySelector("#pumpDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.showFlowConfig) closeFlowConfig();
});

function addPump() {
  const nextNumber = state.pumps.length + 1;
  const pump = {
    id: crypto.randomUUID(),
    code: `P-${String(400 + nextNumber).padStart(3, "0")}`,
    name: "Nueva bomba",
    pumpType: "Centrífuga",
    powerKw: null,
    area: "Sin asignar",
    aviso: "4",
    alarma: "6",
    motorGroup: "",
    hasAxialMeasurement: false,
    hasVfd: false,
    lastFrequencyHz: null,
    status: "Operativa",
    measurements: [],
    maintenanceEvents: [],
    incidents: [],
  };

  state.pumps = [pump, ...state.pumps];
  state.selectedId = pump.id;
  state.filter = "Todas";
  savePumps();
  syncSharedData();
  render();
  showToast("Bomba creada.");
}

function saveSelectedPump(event) {
  event.preventDefault();

  const pump = selectedPump();
  if (!pump) return;

  const form = new FormData(event.target);
  const updated = {
    ...pump,
    code: String(form.get("code") ?? "").trim(),
    name: String(form.get("name") ?? "").trim(),
    pumpType: normalizePumpType(form.get("pumpType"), pump.name),
    powerKw: parseOptionalNumber(form.get("powerKw")),
    area: String(form.get("area") ?? "").trim(),
    aviso: String(form.get("aviso") ?? "").trim(),
    alarma: String(form.get("alarma") ?? "").trim(),
    motorGroup: String(form.get("motorGroup") ?? "").trim(),
    hasAxialMeasurement: form.get("hasAxialMeasurement") === "on",
    hasVfd: form.get("hasVfd") === "on",
    status: String(form.get("status") ?? "Operativa"),
  };

  state.pumps = state.pumps.map((item) => (item.id === pump.id ? updated : item));
  savePumps();
  syncSharedData();
  render();
  showToast("Cambios guardados.");
}

function addIncident(event) {
  event.preventDefault();

  const pump = selectedPump();
  if (!pump) return;

  const form = new FormData(event.target);
  const incident = {
    id: crypto.randomUUID(),
    date: String(form.get("date") ?? new Date().toISOString().slice(0, 10)),
    severity: String(form.get("severity") ?? "Leve"),
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
  };

  state.pumps = state.pumps.map((item) =>
    item.id === pump.id ? { ...item, incidents: [incident, ...item.incidents] } : item,
  );
  savePumps();
  syncSharedData();
  render();
  showToast("Incidencia añadida.");
}

function requestMaintenance() {
  const pump = selectedPump();
  if (!pump) return;

  state.maintenancePumpId = pump.id;
  state.editingMaintenanceId = null;
  render();
}

function requestEditMaintenance(maintenanceId) {
  const pump = selectedPump();
  if (!pump?.maintenanceEvents.some((item) => item.id === maintenanceId)) return;
  state.maintenancePumpId = pump.id;
  state.editingMaintenanceId = maintenanceId;
  render();
}

function cancelMaintenance() {
  state.maintenancePumpId = null;
  state.editingMaintenanceId = null;
  render();
}

function saveMaintenance(event) {
  event.preventDefault();

  const pump = state.pumps.find((item) => item.id === state.maintenancePumpId);
  if (!pump) return;

  const form = new FormData(event.target);
  const maintenance = normalizeMaintenanceEvent({
    id: state.editingMaintenanceId || crypto.randomUUID(),
    date: String(form.get("date") ?? new Date().toISOString().slice(0, 10)),
    type: String(form.get("type") ?? "Preventivo"),
    technician: String(form.get("technician") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
  });

  const editing = Boolean(state.editingMaintenanceId);
  state.pumps = state.pumps.map((item) => {
    if (item.id !== pump.id) return item;
    const maintenanceEvents = editing
      ? item.maintenanceEvents.map((existing) => (existing.id === maintenance.id ? maintenance : existing))
      : [maintenance, ...item.maintenanceEvents];
    return { ...item, maintenanceEvents };
  });
  state.maintenancePumpId = null;
  state.editingMaintenanceId = null;
  state.selectedId = pump.id;
  savePumps();
  void syncSharedData();
  render();
  showToast(editing ? "Mantenimiento actualizado." : "Mantenimiento registrado.");
}

function requestDeleteMaintenance(maintenanceId) {
  const pump = selectedPump();
  if (!pump?.maintenanceEvents.some((item) => item.id === maintenanceId)) return;
  state.pendingMaintenanceDelete = { pumpId: pump.id, maintenanceId };
  render();
}

function cancelDeleteMaintenance() {
  state.pendingMaintenanceDelete = null;
  render();
}

function confirmDeleteMaintenance() {
  if (!state.pendingMaintenanceDelete) return;
  const { pumpId, maintenanceId } = state.pendingMaintenanceDelete;
  state.pumps = state.pumps.map((pump) =>
    pump.id === pumpId
      ? { ...pump, maintenanceEvents: pump.maintenanceEvents.filter((item) => item.id !== maintenanceId) }
      : pump,
  );
  state.pendingMaintenanceDelete = null;
  savePumps();
  void syncSharedData();
  render();
  showToast("Mantenimiento eliminado.");
}

function openFlowConfig() {
  state.showFlowConfig = true;
  render();
}

function closeFlowConfig() {
  state.showFlowConfig = false;
  render();
}

function saveFlowConfig(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  saveSharePointFlowUrl(String(form.get("flowUrl") ?? ""));
  saveConfigSyncUrls(String(form.get("configSaveFlowUrl") ?? ""), String(form.get("configLoadFlowUrl") ?? ""));
  state.showFlowConfig = false;
  state.importMessage =
    state.sharePointFlowUrl || state.configSaveFlowUrl || state.configLoadFlowUrl
      ? "Conexion de SharePoint guardada. Usa cargar ahora para traer la memoria compartida."
      : "No hay URL de Power Automate configurada.";
  render();
  showToast("Configuracion de SharePoint guardada.");
}

async function importMeasurements(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const importData = await readMeasureFile(file);
    const codes = [...new Set(importData.measurements.map((row) => normalizeRow(row).code).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }),
    );
    if (!codes.length) {
      state.importMessage = "No se encontraron medidas nuevas. Revisa que la hoja sea viewdata y que tenga Machine Name, OV-Velocity y RMS(mm/s).";
      render();
      showToast("No se encontraron medidas nuevas.");
      return;
    }
    state.pendingImportData = {
      importData,
      conditions: codes.map((code) => {
        const pump = state.pumps.find((item) => item.code.toLowerCase() === code.toLowerCase());
        return { code, hasVfd: Boolean(pump?.hasVfd), frequencyHz: pump?.lastFrequencyHz ?? null };
      }),
    };
    render();
  } catch (error) {
    state.importMessage = error.message || "No se pudo importar el archivo.";
    render();
    showToast(error.message || "No se pudo importar el archivo.");
  } finally {
    event.target.value = "";
  }
}

function cancelImportConditions() {
  state.pendingImportData = null;
  render();
  showToast("Importacion cancelada.");
}

async function completeMeasurementImport(event) {
  event.preventDefault();
  if (!state.pendingImportData) return;

  const form = new FormData(event.target);
  const conditionMap = new Map();
  for (const [index, condition] of state.pendingImportData.conditions.entries()) {
    const hasVfd = form.get(`vfd-${index}`) === "on";
    const frequencyHz = hasVfd ? parseOptionalNumber(form.get(`frequency-${index}`)) : null;
    if (hasVfd && (frequencyHz === null || frequencyHz <= 0)) {
      showToast(`Indica la frecuencia de ${condition.code}.`);
      document.querySelector(`[data-frequency-input="${index}"]`)?.focus();
      return;
    }
    conditionMap.set(condition.code.toLowerCase(), { hasVfd, frequencyHz });
  }

  const { importData } = state.pendingImportData;
  const enrichedMeasurements = importData.measurements.map((row) => {
    const normalized = normalizeRow(row);
    const condition = conditionMap.get(normalized.code.toLowerCase());
    return { ...row, frequencyHz: condition?.frequencyHz ?? null };
  });
  state.pumps = state.pumps.map((pump) => {
    const condition = conditionMap.get(pump.code.toLowerCase());
    return condition ? { ...pump, hasVfd: condition.hasVfd, lastFrequencyHz: condition.frequencyHz } : pump;
  });

  try {
    const result = mergeMeasurements(enrichedMeasurements, conditionMap);
    const viewDataResult = mergeViewDataBlocks(importData.blocks);
    state.pendingImportData = null;
    state.frequencyBand = "all";
    savePumps();
    saveViewDataBlocks();
    void syncSharedData();
    if (!result.measurements && !result.sharedMeasurements) {
      state.importMessage = "No se encontraron medidas nuevas; las lecturas ya estaban importadas.";
      render();
      showToast("No había medidas nuevas.");
      return;
    }
    const sharedMessage = result.sharedMeasurements
      ? ` ${result.sharedMeasurements} medidas de motor replicadas en bombas vinculadas.`
      : "";
    state.importMessage = `Importacion correcta: ${result.measurements} medidas Velocity RMS leidas del archivo en ${result.pumps} bombas.${sharedMessage} Excel historico actualizado con ${viewDataResult.rows} filas completas de ViewData.`;
    render();
    showToast(
      `${result.measurements} medidas importadas${result.sharedMeasurements ? ` y ${result.sharedMeasurements} de motor replicadas` : ""}.`,
    );
    await updateSharePointExcel();
  } catch (error) {
    state.pendingImportData = null;
    state.importMessage = error.message || "No se pudo completar la importacion.";
    render();
    showToast(state.importMessage);
  }
}

async function readMeasureFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "csv") return { measurements: parseCsv(await file.text()), blocks: [] };

  if (!window.XLSX) {
    throw new Error("No se cargo la libreria Excel. Abre la app con conexion a internet o desde GitHub Pages.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames.find((name) => name.trim().toLowerCase() === "viewdata") ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No se pudo abrir la hoja viewdata del Excel.");
  const matrix = sheetToMatrix(sheet);
  const viewData = parseViewDataSheet(matrix);
  if (viewData.measurements.length) return viewData;

  return { measurements: window.XLSX.utils.sheet_to_json(sheet, { defval: "" }), blocks: [] };
}

function sheetToMatrix(sheet) {
  const range = window.XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  const rows = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row = [];
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const address = window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = sheet[address];
      row.push(cell ? cell.w ?? cell.v ?? "" : "");
    }
    rows.push(row);
  }

  return rows;
}

function parseViewDataSheet(rows) {
  const measurements = [];
  const blocks = [];

  rows.forEach((row, rowIndex) => {
    const machineCellIndex = row.findIndex((cell) => String(cell).toLowerCase().includes("machine name"));
    if (machineCellIndex === -1) return;

    const machineName = extractMachineName(row[machineCellIndex]);
    if (!machineName) return;

    const { code, point } = splitMachineName(machineName);
    const headerRows = findHeaderRows(rows, rowIndex);
    if (!headerRows) return;

    const dateColumn = findDateColumn(rows, headerRows.groupRowIndex, headerRows.valueRowIndex);
    const velocityRmsColumn = findVelocityRmsColumn(rows, headerRows.groupRowIndex, headerRows.valueRowIndex);
    const cfPlusColumn = findCfPlusColumn(rows, headerRows.groupRowIndex, headerRows.valueRowIndex);
    if (dateColumn === -1 || velocityRmsColumn === -1) return;

    const block = {
      machineName,
      dateColumn,
      valueColumn: velocityRmsColumn,
      cfPlusColumn,
      headerRows: [
        normalizeRowLength(rows[rowIndex]),
        normalizeRowLength(rows[headerRows.groupRowIndex]),
        normalizeRowLength(rows[headerRows.valueRowIndex]),
      ],
      dataRows: [],
    };

    for (let dataRowIndex = headerRows.valueRowIndex + 1; dataRowIndex < rows.length; dataRowIndex += 1) {
      const dataRow = rows[dataRowIndex];
      if (!dataRow?.length) continue;
      if (dataRow.some((cell) => String(cell).toLowerCase().includes("machine name"))) break;

      const date = normalizeDate(dataRow[dateColumn]);
      const dateTime = normalizeDateTime(dataRow[dateColumn]);
      const vibration = parseNumber(dataRow[velocityRmsColumn]);
      const cfPlus = cfPlusColumn === -1 ? null : parseOptionalNumber(dataRow[cfPlusColumn]);
      if (!date || !vibration) continue;

      measurements.push({
        bomba: code,
        punto: point,
        fecha: date,
        fechaHora: dateTime,
        vibracion: vibration,
        cfPlus,
        unidad: "mm/s",
        nombre: code,
        area: "",
      });
      block.dataRows.push(normalizeRowLength(dataRow));
    }

    if (block.dataRows.length) blocks.push(block);
  });

  return { measurements, blocks };
}

function normalizeRowLength(row, length = 29) {
  const normalized = Array.from({ length }, (_, index) => row?.[index] ?? "");
  while (normalized.length && normalized.at(-1) === "") normalized.pop();
  return normalized;
}

function extractMachineName(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/machine name\s*:\s*(.+)$/i);
  return (match?.[1] ?? text).trim();
}

function splitMachineName(machineName) {
  const parts = String(machineName).split("/");
  return {
    code: (parts[0] || machineName).trim(),
    point: normalizeMeasurementPoint(parts[1] || ""),
  };
}

function findHeaderRows(rows, machineRowIndex) {
  for (let index = machineRowIndex + 1; index < Math.min(rows.length, machineRowIndex + 8); index += 1) {
    const rowText = rows[index].map((cell) => String(cell).toLowerCase()).join(" ");
    const nextRowText = (rows[index + 1] ?? []).map((cell) => String(cell).toLowerCase()).join(" ");
    if (rowText.includes("record") && rowText.includes("ov-velocity") && nextRowText.includes("rms")) {
      return { groupRowIndex: index, valueRowIndex: index + 1 };
    }
    if (rowText.includes("record") && rowText.includes("rms")) {
      return { groupRowIndex: index - 1, valueRowIndex: index };
    }
  }
  return null;
}

function findColumn(row, terms) {
  return row.findIndex((cell) => terms.every((term) => cleanKey(cell).includes(cleanKey(term))));
}

function findDateColumn(rows, groupRowIndex, valueRowIndex) {
  for (const index of [groupRowIndex, valueRowIndex, valueRowIndex + 1]) {
    const row = rows[index] ?? [];
    const column = findColumn(row, ["date", "time"]);
    if (column !== -1) return column;
  }

  const headerRow = rows[valueRowIndex] ?? [];
  if (cleanKey(headerRow[0]).includes("record")) return 1;
  return -1;
}

function findVelocityRmsColumn(rows, groupRowIndex, valueRowIndex) {
  const groupRow = rows[groupRowIndex] ?? [];
  const headerRow = rows[valueRowIndex] ?? [];
  let inVelocityGroup = false;

  for (let column = 0; column < headerRow.length; column += 1) {
    const group = cleanKey(groupRow[column]);
    const header = cleanKey(headerRow[column]);
    if (group.includes("ovvelocity")) inVelocityGroup = true;
    if (inVelocityGroup && header.includes("rms") && header.includes("mms")) return column;
    if (inVelocityGroup && group && !group.includes("ovvelocity")) inVelocityGroup = false;
  }

  const velocityColumn = findColumnByText(groupRow, "ovvelocity");
  if (velocityColumn !== -1) {
    for (let column = velocityColumn; column < Math.min(headerRow.length, velocityColumn + 8); column += 1) {
      const header = cleanKey(headerRow[column]);
      if (header.includes("rms") && header.includes("mms")) return column;
    }
  }

  return headerRow.findIndex((cell) => isVelocityRmsHeader(cell));
}

function findCfPlusColumn(rows, groupRowIndex, valueRowIndex) {
  for (const index of [groupRowIndex, valueRowIndex, valueRowIndex + 1]) {
    const row = rows[index] ?? [];
    const column = row.findIndex((cell) => cleanKey(cell) === "cfplus");
    if (column !== -1) return column;
  }
  return -1;
}

function findColumnByText(row, text) {
  const target = cleanKey(text);
  return row.findIndex((cell) => cleanKey(cell).includes(target));
}

function isVelocityRmsHeader(value) {
  const header = cleanKey(value);
  return header.includes("rms") && header.includes("mms");
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], separator);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, separator);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line, separator) {
  const result = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === separator && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function mergeMeasurements(rows, conditionMap = new Map()) {
  let importedMeasurements = 0;
  let sharedMeasurements = 0;
  const touchedPumps = new Set();

  for (const row of rows) {
    const normalized = normalizeRow(row);
    if (!normalized.code || !normalized.vibration || !normalized.date) continue;

    let pump = state.pumps.find((item) => item.code.toLowerCase() === normalized.code.toLowerCase());
    if (!pump) {
      const condition = conditionMap.get(normalized.code.toLowerCase());
      pump = {
        id: crypto.randomUUID(),
        code: normalized.code,
        name: normalized.name || normalized.code,
        pumpType: "Otra",
        powerKw: null,
        area: normalized.area || "Importada",
        aviso: "4",
        alarma: "6",
        motorGroup: "",
        hasAxialMeasurement: false,
        hasVfd: Boolean(condition?.hasVfd),
        lastFrequencyHz: condition?.frequencyHz ?? null,
        status: "Operativa",
        measurements: [],
        maintenanceEvents: [],
        incidents: [],
      };
      state.pumps.push(pump);
    }

    const measurement = {
      id: crypto.randomUUID(),
      date: normalized.date,
      dateTime: normalized.dateTime,
      point: normalized.point,
      vibration: normalized.vibration,
      cfPlus: normalized.cfPlus,
      frequencyHz: normalized.frequencyHz,
      unit: normalized.unit || "mm/s",
      source: "Fluke 805 FC",
    };

    if (mergeMeasurementIntoPump(pump, measurement)) {
      touchedPumps.add(pump.id);
      importedMeasurements += 1;
    }

    if (!MOTOR_MEASUREMENT_POINTS.has(measurement.point) || !pump.motorGroup) continue;

    const motorGroupKey = pump.motorGroup.trim().toLowerCase();
    state.pumps
      .filter((item) => item.id !== pump.id && item.motorGroup.trim().toLowerCase() === motorGroupKey)
      .forEach((linkedPump) => {
        const sharedMeasurement = { ...measurement, id: crypto.randomUUID() };
        if (!mergeMeasurementIntoPump(linkedPump, sharedMeasurement)) return;
        touchedPumps.add(linkedPump.id);
        sharedMeasurements += 1;
      });
  }

  state.pumps = state.pumps.map((pump) => {
    if (!touchedPumps.has(pump.id)) return pump;
    return { ...pump, measurements: pump.measurements.sort((a, b) => a.date.localeCompare(b.date)) };
  });

  return { measurements: importedMeasurements, sharedMeasurements, pumps: touchedPumps.size };
}

function mergeMeasurementIntoPump(pump, measurement) {
  const existingMeasurement = pump.measurements.find(
    (item) =>
      item.date === measurement.date &&
      item.dateTime === measurement.dateTime &&
      item.point === measurement.point &&
      Number(item.vibration) === Number(measurement.vibration),
  );
  if (!existingMeasurement) {
    pump.measurements.push(measurement);
    return true;
  }

  if (existingMeasurement.cfPlus === null || existingMeasurement.cfPlus === undefined) {
    existingMeasurement.cfPlus = measurement.cfPlus;
  }
  if (existingMeasurement.frequencyHz === null || existingMeasurement.frequencyHz === undefined) {
    existingMeasurement.frequencyHz = measurement.frequencyHz;
  }
  return false;
}

function mergeViewDataBlocks(blocks) {
  let importedRows = 0;

  for (const block of blocks) {
    let existing = state.viewDataBlocks.find((item) => item.machineName === block.machineName);
    if (!existing) {
      existing = {
        machineName: block.machineName,
        dateColumn: block.dateColumn,
        valueColumn: block.valueColumn,
        headerRows: block.headerRows,
        dataRows: [],
      };
      state.viewDataBlocks.push(existing);
    }

    for (const row of block.dataRows) {
      const rowKey = viewDataRowKey(existing, row);
      const alreadyExists = existing.dataRows.some((item) => viewDataRowKey(existing, item) === rowKey);
      if (alreadyExists) continue;

      existing.dataRows.push(row);
      importedRows += 1;
    }

    existing.dataRows.sort((a, b) => String(a[existing.dateColumn] ?? "").localeCompare(String(b[existing.dateColumn] ?? "")));
  }

  state.viewDataBlocks.sort((a, b) => a.machineName.localeCompare(b.machineName));
  return { rows: importedRows, blocks: blocks.length };
}

function viewDataRowKey(block, row) {
  const date = row[block.dateColumn] ?? "";
  const value = row[block.valueColumn] ?? "";
  return `${block.machineName}|${date}|${value}`;
}

function downloadHistoryExcel() {
  if (!window.XLSX) {
    showToast("No se pudo generar el Excel porque falta la libreria XLSX.");
    return;
  }

  const workbook = buildHistoryWorkbook();
  window.XLSX.writeFile(workbook, `historico_vibraciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function buildHistoryWorkbook() {
  const rows = buildViewDataExportRows();
  const workbook = window.XLSX.utils.book_new();
  const sheet = window.XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = buildViewDataMerges(rows);
  sheet["!cols"] = [
    { wch: 10 },
    { wch: 18 },
    { wch: 12 },
    ...Array.from({ length: 30 }, () => ({ wch: 12 })),
  ];
  window.XLSX.utils.book_append_sheet(workbook, sheet, "viewdata");
  return workbook;
}

async function updateSharePointExcel() {
  if (!state.sharePointFlowUrl) {
    state.importMessage += " Configura SharePoint para enviar el Excel maestro automaticamente.";
    render();
    showToast("Configura SharePoint para actualizar el Excel maestro.");
    return;
  }

  if (!window.XLSX) {
    throw new Error("No se pudo generar el Excel maestro porque falta la libreria XLSX.");
  }

  const fileName = "Historico_Bombas_Fluke.xlsx";
  const workbook = buildHistoryWorkbook();
  const fileBase64 = window.XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  const fileContentDataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${fileBase64}`;

  const response = await fetch(state.sharePointFlowUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName,
      fileContentBase64: fileBase64,
      fileContentDataUri,
      updatedAt: new Date().toISOString(),
      source: "App mantenimiento preventivo de bombas",
    }),
  });

  if (!response.ok) {
    const errorDetail = await response.text().catch(() => "");
    const readableDetail = errorDetail ? ` Detalle: ${errorDetail.slice(0, 240)}` : "";
    throw new Error(`Power Automate no pudo actualizar SharePoint. Codigo ${response.status}.${readableDetail}`);
  }

  state.importMessage += " Excel maestro enviado a SharePoint mediante Power Automate.";
  render();
  showToast("Excel maestro actualizado en SharePoint.");
}

function sharedDataPayload() {
  const updatedAt = localStorage.getItem(LOCAL_UPDATED_AT_KEY) || new Date().toISOString();
  return {
    version: 2,
    updatedAt,
    source: "App mantenimiento preventivo de bombas",
    pumps: state.pumps,
    viewDataBlocks: state.viewDataBlocks,
    plantNotes: state.plantNotes,
    alerts: currentAlerts(),
  };
}

async function syncSharedData() {
  if (!state.configSaveFlowUrl) return false;

  try {
    const response = await fetch(state.configSaveFlowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sharedDataPayload()),
    });

    if (!response.ok) throw new Error(`Codigo ${response.status}`);
    return true;
  } catch (error) {
    console.warn("No se pudo sincronizar la configuracion compartida.", error);
    return false;
  }
}

async function loadSharedDataManually() {
  const loaded = await loadSharedDataFromSharePoint({ manual: true });
  render();
  showToast(loaded ? "Memoria cargada desde SharePoint." : "No se pudo cargar la memoria.");
}

async function importMemoryJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const sharedData = parseSharedDataPayload(await file.text());
    applySharedData(sharedData);
    state.importMessage = `Memoria JSON importada: ${state.pumps.length} bombas cargadas.`;
    render();
    showToast("Memoria JSON importada.");
  } catch (error) {
    state.importMessage = error.message || "No se pudo importar la memoria JSON.";
    render();
    showToast("No se pudo importar el JSON.");
  } finally {
    event.target.value = "";
  }
}

async function loadSharedDataFromSharePoint({ manual = false } = {}) {
  if (!state.configLoadFlowUrl) return false;

  try {
    const response = await fetch(state.configLoadFlowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "App mantenimiento preventivo de bombas" }),
    });

    if (!response.ok) throw new Error(`Codigo ${response.status}`);

    const responseText = await response.text();
    const sharedData = parseSharedDataPayload(responseText);
    const remotePumpCount = sharedData.pumps.length;
    const localUpdatedAt = localStorage.getItem(LOCAL_UPDATED_AT_KEY);

    if (!manual && state.pumps.length && !remotePumpCount) {
      state.importMessage = "SharePoint devolvio una memoria vacia. Se conservaron los datos locales.";
      return false;
    }

    if (!manual && localUpdatedAt && isNewerTimestamp(localUpdatedAt, sharedData.updatedAt)) {
      state.importMessage = "Se conservaron los cambios locales porque son mas recientes que la memoria de SharePoint.";
      void syncSharedData();
      return false;
    }

    applySharedData(sharedData);
    state.importMessage = `Datos compartidos cargados desde SharePoint: ${remotePumpCount} bombas.`;
    return true;
  } catch (error) {
    state.importMessage = `No se pudieron cargar los datos compartidos desde SharePoint. ${error.message || "Se usaran los datos locales."}`;
    console.warn("No se pudieron cargar los datos compartidos.", error);
    return false;
  }
}

function parseSharedDataPayload(payload) {
  let data = payload;

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) throw new Error("La respuesta de Power Automate esta vacia.");
    data = JSON.parse(trimmed);
  }

  if (data?.appData) {
    data = typeof data.appData === "string" ? JSON.parse(data.appData) : data.appData;
  }

  if (data?.$content) {
    data = JSON.parse(decodeBase64Text(data.$content));
  }

  if (!Array.isArray(data?.pumps)) {
    throw new Error("El JSON recibido no contiene la lista pumps.");
  }

  return {
    pumps: data.pumps,
    viewDataBlocks: Array.isArray(data.viewDataBlocks) ? data.viewDataBlocks : [],
    plantNotes: Array.isArray(data.plantNotes) ? data.plantNotes.map(normalizePlantNote).filter((note) => note.text) : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

function isNewerTimestamp(candidate, reference) {
  const candidateTime = Date.parse(candidate);
  const referenceTime = Date.parse(reference);
  if (!Number.isFinite(candidateTime)) return false;
  if (!Number.isFinite(referenceTime)) return true;
  return candidateTime > referenceTime;
}

function decodeBase64Text(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function applySharedData(sharedData) {
  state.pumps = sharedData.pumps.map(normalizePump);
  state.viewDataBlocks = sharedData.viewDataBlocks;
  if (Array.isArray(sharedData.plantNotes)) {
    state.plantNotes = sharedData.plantNotes.slice(0, MAX_PLANT_NOTES);
    savePlantNotes({ markUpdated: false });
  }
  state.selectedId = state.pumps[0]?.id ?? null;
  state.filter = "Todas";
  savePumps({ markUpdated: false });
  saveViewDataBlocks({ markUpdated: false });
  localStorage.setItem(LOCAL_UPDATED_AT_KEY, sharedData.updatedAt || new Date().toISOString());
}

function buildViewDataExportRows() {
  if (state.viewDataBlocks.length) return buildRawViewDataExportRows();

  const rows = [];
  const sortedPumps = [...state.pumps].sort((a, b) => a.code.localeCompare(b.code));

  sortedPumps.forEach((pump) => {
    measurementPointsForPump(pump).forEach((point) => {
      const measurements = pump.measurements
        .map(normalizeMeasurement)
        .filter((item) => item.point === point)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (!measurements.length) return;

      rows.push([`Machine Name: ${pump.code}/${point}`]);
      rows.push([
        "",
        "",
        "",
        "OV-Acceleration",
        "",
        "",
        "",
        "",
        "",
        "OV-Velocity",
        "",
        "",
        "",
        "",
        "",
        "OV-Displacement",
        "",
        "",
        "",
        "",
        "",
        "HF-Acceleration",
        "",
        "",
        "",
        "",
        "",
        "Temperature",
        "",
        "CFPlus",
      ]);
      rows.push([
        "Record No",
        "Date & Time (DD/MM/Y Y 24 Hr)",
        "",
        "Peak(g)",
        "Peak(m/s²)",
        "Rms(g)",
        "RMS(m/s²)",
        "Pk-Pk(g)",
        "Pk-Pk(m/s²)",
        "Peak(in/s)",
        "Peak(mm/s)",
        "Rms(in/s)",
        "RMS(mm/s)",
        "Pk-Pk(in/s)",
        "Pk-Pk(mm/s)",
        "Peak(µm)",
        "Rms(mils)",
        "RMS(µm)",
        "Pk-Pk(mil)",
        "Pk-Pk(µm)",
        "",
        "Peak(g)",
        "Peak(m/s²)",
        "Rms(g)",
        "RMS(m/s²)",
        "Pk-Pk(g)",
        "Pk-Pk(m/s²)",
        "Centigrade",
        "Fahrenheit",
        "CFPlus",
      ]);

      measurements.forEach((item, index) => {
        const outputRow = Array.from({ length: 30 }, () => "");
        outputRow[0] = index + 1;
        outputRow[1] = formatDateTimeForExcel(item.dateTime || item.date);
        outputRow[12] = Number(item.vibration);
        rows.push(outputRow);
      });

      rows.push([]);
    });
  });

  return rows.length ? rows : [["Machine Name:"], ["Sin datos importados"]];
}

function buildRawViewDataExportRows() {
  const rows = [];

  state.viewDataBlocks.forEach((block) => {
    block.headerRows.forEach((row) => rows.push(row));
    block.dataRows.forEach((row, index) => {
      const outputRow = [...row];
      outputRow[0] = index + 1;
      rows.push(outputRow);
    });
    rows.push([]);
  });

  return rows.length ? rows : [["Machine Name:"], ["Sin datos importados"]];
}

function buildViewDataMerges(rows) {
  const merges = [];
  rows.forEach((row, index) => {
    if (String(row[0] ?? "").startsWith("Machine Name:")) merges.push({ s: { r: index, c: 0 }, e: { r: index, c: 7 } });
    if (row[3] === "OV-Acceleration") merges.push({ s: { r: index, c: 3 }, e: { r: index, c: 8 } });
    if (row[9] === "OV-Velocity") merges.push({ s: { r: index, c: 9 }, e: { r: index, c: 14 } });
    if (row[15] === "OV-Displacement") merges.push({ s: { r: index, c: 15 }, e: { r: index, c: 20 } });
    if (row[21] === "HF-Acceleration") merges.push({ s: { r: index, c: 21 }, e: { r: index, c: 26 } });
    if (row[27] === "Temperature") merges.push({ s: { r: index, c: 27 }, e: { r: index, c: 28 } });
  });
  return merges;
}

function formatDateTimeForExcel(value) {
  const normalized = normalizeDateTime(value);
  if (normalized.includes(" ")) {
    const [datePart, timePart] = normalized.split(" ");
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year} ${timePart}`;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeDateTime(value) {
  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}`;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const spanish = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (spanish) {
    const [, day, month, year, hour = "00", minute = "00"] = spanish;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${hour.padStart(2, "0")}:${minute}`;
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    const year = direct.getFullYear();
    const month = String(direct.getMonth() + 1).padStart(2, "0");
    const day = String(direct.getDate()).padStart(2, "0");
    const hour = String(direct.getHours()).padStart(2, "0");
    const minute = String(direct.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  return raw;
}

function normalizeRow(row) {
  const get = (...names) => {
    const entries = Object.entries(row);
    for (const name of names) {
      const found = entries.find(([key]) => cleanKey(key) === cleanKey(name));
      if (found) return found[1];
    }
    return "";
  };

  return {
    code: String(get("bomba", "codigo", "codigo bomba", "equipo", "asset", "machine", "maquina")).trim(),
    name: String(get("nombre", "descripcion", "description")).trim(),
    area: String(get("area", "zona", "ubicacion", "location")).trim(),
    date: normalizeDate(get("fecha", "date", "datetime", "fecha medida", "measurement date")),
    dateTime: normalizeDateTime(get("fechaHora", "fecha hora", "datetime", "measurement date", "fecha medida", "date", "fecha")),
    point: normalizeMeasurementPoint(get("punto", "punto medida", "measurement point", "point")),
    vibration: parseNumber(get("vibracion", "vibration", "overall vibration", "valor", "rms")),
    cfPlus: parseOptionalNumber(get("cfPlus", "cf plus", "crest factor plus")),
    frequencyHz: parseOptionalNumber(get("frequencyHz", "frecuencia", "frecuencia hz", "hz")),
    unit: String(get("unidad", "unit")).trim() || "mm/s",
  };
}

function normalizeMeasurementPoint(value) {
  const raw = String(value ?? "").trim();
  const key = cleanKey(raw);

  if (!raw) return "B-LA";
  if (key === "bla" || key.includes("bombala") || key.includes("bombaladoacoplamiento") || key.includes("bombaacoplamiento")) return "B-LA";
  if (key === "bloa" || key.includes("bombaloa") || key.includes("bombaladoopuesto") || key.includes("bombaopuesto")) return "B-LOA";
  if (key === "mla" || key.includes("motorla") || key.includes("motorladoacoplamiento")) return "M-LA";
  if (key === "mloa" || key.includes("motorloa") || key.includes("motoropuesto") || key.includes("motorladoopuesto")) return "M-LOA";

  const compact = raw.toUpperCase().replace(/\s+/g, "").replaceAll("_", "-");
  if (MEASUREMENT_POINTS.includes(compact)) return compact;

  return raw.toUpperCase().includes("M") ? "M-LA" : "B-LA";
}

function cleanKey(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseNumber(value) {
  const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeDate(value) {
  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

  return raw;
}

function requestDeleteSelectedPump() {
  const pump = selectedPump();
  if (!pump) return;

  state.pendingDeleteId = pump.id;
  render();
}

function cancelDeletePump() {
  state.pendingDeleteId = null;
  render();
}

function confirmDeletePump() {
  if (!state.pendingDeleteId) return;

  const pump = state.pumps.find((item) => item.id === state.pendingDeleteId);
  state.pumps = state.pumps.filter((item) => item.id !== state.pendingDeleteId);
  if (pump) {
    state.viewDataBlocks = state.viewDataBlocks.filter((block) => !blockMatchesPumpCode(block, pump.code));
  }
  state.pendingDeleteId = null;
  state.selectedId = state.pumps[0]?.id ?? null;
  savePumps();
  saveViewDataBlocks();
  syncSharedData();
  render();
  showToast("Bomba eliminada.");
}

function requestResetSelectedPump() {
  const pump = selectedPump();
  if (!pump) return;

  state.pendingPumpResetId = pump.id;
  render();
}

function cancelResetPump() {
  state.pendingPumpResetId = null;
  render();
}

function confirmResetPump() {
  if (!state.pendingPumpResetId) return;

  const pump = state.pumps.find((item) => item.id === state.pendingPumpResetId);
  if (!pump) return;

  state.pumps = state.pumps.map((item) =>
    item.id === pump.id ? { ...item, measurements: [] } : item,
  );
  state.pendingPumpResetId = null;
  state.selectedId = pump.id;
  state.importMessage = `Medidas activas de ${pump.code} reseteadas. El historial maestro se conserva.`;
  savePumps();
  render();
  showToast("Bomba reseteada.");
  void syncSharedData();
}

function blockMatchesPumpCode(block, code) {
  const machineCode = String(block?.machineName ?? "").split("/")[0].trim().toLowerCase();
  return machineCode === String(code ?? "").trim().toLowerCase();
}

function requestResetHistory() {
  state.pendingHistoryReset = true;
  render();
}

function cancelResetHistory() {
  state.pendingHistoryReset = false;
  render();
}

function confirmResetHistory() {
  state.pumps = state.pumps.map((pump) => ({ ...pump, measurements: [] }));
  state.viewDataBlocks = [];
  state.pendingHistoryReset = false;
  state.importMessage = "Historial de vibraciones reseteado.";
  savePumps();
  saveViewDataBlocks();
  syncSharedData();
  render();
  showToast("Historial reseteado.");
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function formatDate(value) {
  if (!value) return "sin fecha";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
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

async function initApp() {
  await loadSharedDataFromSharePoint();
  render();
  mountPredictiveChat({
    getContext: () => buildPredictiveContext(state.pumps, state.selectedId, state.viewDataBlocks),
  });
}

initApp();
