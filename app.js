const STORAGE_KEY = "gestor-bombas-v3";
const VIEWDATA_STORAGE_KEY = "gestor-bombas-viewdata-v1";
const MEASUREMENT_POINTS = ["B-LA", "B-LOA", "M-LA", "M-LOA"];
const POINT_COLORS = {
  "B-LA": "#0f766e",
  "B-LOA": "#2563eb",
  "M-LA": "#a16207",
  "M-LOA": "#b42318",
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
    status: "En observacion",
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
  selectedId: null,
  query: "",
  filter: "Todas",
  pendingDeleteId: null,
  importMessage: "",
};

const app = document.querySelector("#app");

function loadPumps() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return demoPumps;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizePump) : demoPumps;
  } catch {
    return demoPumps;
  }
}

function normalizePump(pump) {
  return {
    id: pump.id ?? crypto.randomUUID(),
    code: pump.code ?? "",
    name: pump.name ?? "Bomba sin nombre",
    area: pump.area ?? "Sin asignar",
    status: pump.status ?? "Operativa",
    measurements: Array.isArray(pump.measurements) ? pump.measurements.map(normalizeMeasurement) : [],
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
    unit: item.unit || "mm/s",
    source: item.source || "Fluke 805 FC",
  };
}

function savePumps() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pumps));
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

function saveViewDataBlocks() {
  localStorage.setItem(VIEWDATA_STORAGE_KEY, JSON.stringify(state.viewDataBlocks));
}

function selectedPump() {
  if (!state.selectedId && state.pumps.length) state.selectedId = state.pumps[0].id;
  return state.pumps.find((pump) => pump.id === state.selectedId) ?? null;
}

function filteredPumps() {
  return state.pumps.filter((pump) => {
    const query = state.query.trim().toLowerCase();
    const matchesQuery =
      !query ||
      pump.code.toLowerCase().includes(query) ||
      pump.name.toLowerCase().includes(query) ||
      pump.area.toLowerCase().includes(query);
    const matchesFilter = state.filter === "Todas" || pump.status === state.filter;
    return matchesQuery && matchesFilter;
  });
}

function latestMeasurement(pump) {
  return [...pump.measurements].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
}

function latestMeasurementsByPoint(pump) {
  const latest = Object.fromEntries(MEASUREMENT_POINTS.map((point) => [point, null]));
  for (const item of [...pump.measurements].sort((a, b) => a.date.localeCompare(b.date))) {
    if (MEASUREMENT_POINTS.includes(item.point)) latest[item.point] = item;
  }
  return latest;
}

function statusClass(status) {
  if (status === "Operativa") return "ok";
  if (status === "En observacion") return "warn";
  return "stop";
}

function render() {
  const selected = selectedPump();
  const pumps = filteredPumps();
  const counts = {
    Todas: state.pumps.length,
    Operativa: state.pumps.filter((pump) => pump.status === "Operativa").length,
    "En observacion": state.pumps.filter((pump) => pump.status === "En observacion").length,
    Parada: state.pumps.filter((pump) => pump.status === "Parada").length,
  };

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">V</div>
          <div>
            <h1>Vibracion Bombas</h1>
            <p>Historial e incidencias</p>
          </div>
        </div>
        <nav class="nav-section" aria-label="Filtros por estado">
          ${["Todas", "Operativa", "En observacion", "Parada"]
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
      </aside>

      <main class="main">
        <section class="topbar">
          <div>
            <p class="eyebrow">Fluke 805 FC</p>
            <h2>Historial de vibraciones</h2>
            <p>Importa las medidas del equipo, registra incidencias de operacion y consulta la evolucion de cada bomba desde su ficha.</p>
          </div>
          <div class="toolbar">
            <input id="measureFile" type="file" accept=".csv,.xlsx,.xls,.xlsm" hidden />
            <button class="button secondary" id="importMeasures">Importar Excel/CSV</button>
            <button class="button secondary" id="downloadHistory">Descargar Excel maestro</button>
            <button class="button" id="addPump">+ Nueva bomba</button>
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
                ${["Todas", "Operativa", "En observacion", "Parada"]
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

          <div class="panel detail">
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
    <div class="toast" id="toast"></div>
  `;

  bindEvents();
}

function renderPumpRow(pump) {
  const latest = latestMeasurement(pump);
  const status = statusClass(pump.status);

  return `
    <button class="pump-row ${pump.id === state.selectedId ? "active" : ""}" data-select="${pump.id}">
      <div>
        <div class="pump-title">
          <span class="pump-code">${escapeHtml(pump.code)}</span>
          <span class="pump-name">${escapeHtml(pump.name)}</span>
        </div>
        <div class="pump-meta">
          <span class="tag">${escapeHtml(pump.area)}</span>
          <span class="tag ${status}">${escapeHtml(pump.status)}</span>
          <span class="tag">${latest ? `${latest.vibration} ${latest.unit}` : "sin medidas"}</span>
          <span class="tag">${pump.incidents.length} incid.</span>
        </div>
      </div>
      <span class="status-dot ${status}" aria-hidden="true"></span>
    </button>
  `;
}

function renderDetail(pump) {
  const status = statusClass(pump.status);
  const latest = latestMeasurement(pump);
  const latestByPoint = latestMeasurementsByPoint(pump);
  const average = pump.measurements.length
    ? pump.measurements.reduce((sum, item) => sum + Number(item.vibration), 0) / pump.measurements.length
    : 0;
  const max = pump.measurements.length ? Math.max(...pump.measurements.map((item) => Number(item.vibration))) : 0;

  return `
    <div class="panel-header">
      <h3>${escapeHtml(pump.code)} · ${escapeHtml(pump.name)}</h3>
      <span class="tag ${status}">${escapeHtml(pump.status)}</span>
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
          <span>4 puntos fijos</span>
        </div>
        <div class="point-grid">
          ${MEASUREMENT_POINTS.map((point) => renderPointSummary(point, latestByPoint[point])).join("")}
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
          Nombre
          <input class="field" name="name" value="${escapeHtml(pump.name)}" required />
        </label>
        <label>
          Estado
          <select class="field" name="status">
            ${["Operativa", "En observacion", "Parada"]
              .map((statusOption) => `<option value="${statusOption}" ${pump.status === statusOption ? "selected" : ""}>${statusOption}</option>`)
              .join("")}
          </select>
        </label>
        <div class="detail-actions">
          <button class="button danger" type="button" id="deletePump">Eliminar bomba</button>
          <button class="button" type="submit">Guardar</button>
        </div>
      </form>

      <section class="history-section">
        <div class="section-heading">
          <h4>Grafica de vibracion</h4>
          <span>B-LA · B-LOA · M-LA · M-LOA</span>
        </div>
        ${renderChart(pump.measurements)}
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
      <small>${item ? formatDate(item.date) : "sin medida"}</small>
    </div>
  `;
}

function renderChart(measurements) {
  const items = [...measurements]
    .map(normalizeMeasurement)
    .filter((item) => MEASUREMENT_POINTS.includes(item.point))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!items.length) {
    return `<div class="empty-inline">Todavia no hay medidas para graficar.</div>`;
  }

  const width = 680;
  const height = 270;
  const pad = 34;
  const dates = [...new Set(items.map((item) => item.date))].slice(-10);
  const visibleItems = items.filter((item) => dates.includes(item.date));
  const maxValue = Math.max(1, ...items.map((item) => Number(item.vibration)));
  const xForDate = (date) => {
    const index = dates.indexOf(date);
    return dates.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (dates.length - 1);
  };
  const yForValue = (value) => height - pad - (Number(value) / maxValue) * (height - pad * 2);

  const series = MEASUREMENT_POINTS.map((point) => {
    const pointItems = visibleItems.filter((item) => item.point === point);
    const chartPoints = pointItems.map((item) => ({ ...item, x: xForDate(item.date), y: yForValue(item.vibration) }));
    const path = chartPoints.map((item, index) => `${index ? "L" : "M"} ${item.x.toFixed(1)} ${item.y.toFixed(1)}`).join(" ");
    return { point, chartPoints, path };
  });

  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafica de vibracion">
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
                    <circle cx="${point.x}" cy="${point.y}" r="4.5" style="stroke: ${POINT_COLORS[line.point]}" />
                  </g>
                `,
              )
              .join("")}
          `,
        )
        .join("")}
      ${MEASUREMENT_POINTS
        .map(
          (point, index) => `
            <g class="chart-legend">
              <rect x="${pad + index * 118}" y="12" width="10" height="10" rx="2" style="fill: ${POINT_COLORS[point]}" />
              <text x="${pad + 16 + index * 118}" y="22">${point}</text>
            </g>
          `,
        )
        .join("")}
      <text x="${pad}" y="${height - 8}">${escapeHtml(dates[0])}</text>
      <text x="${width - pad}" y="${height - 8}" text-anchor="end">${escapeHtml(dates.at(-1))}</text>
    </svg>
  `;
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
            <th>Vibracion</th>
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
                  <td><strong>${item.vibration} ${escapeHtml(item.unit)}</strong></td>
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
        <p>Se eliminara <strong>${escapeHtml(pump.code)}</strong> junto con su historial de medidas e incidencias guardadas en esta aplicacion.</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" id="cancelDelete">Cancelar</button>
          <button class="button danger" type="button" id="confirmDelete">Eliminar bomba</button>
        </div>
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
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.select;
      render();
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
  document.querySelector("#cancelDelete")?.addEventListener("click", cancelDeletePump);
  document.querySelector("#confirmDelete")?.addEventListener("click", confirmDeletePump);
  document.querySelector("#pumpForm")?.addEventListener("submit", saveSelectedPump);
  document.querySelector("#incidentForm")?.addEventListener("submit", addIncident);
  document.querySelector("#importMeasures")?.addEventListener("click", () => document.querySelector("#measureFile")?.click());
  document.querySelector("#measureFile")?.addEventListener("change", importMeasurements);
  document.querySelector("#downloadHistory")?.addEventListener("click", downloadHistoryExcel);
}

function addPump() {
  const nextNumber = state.pumps.length + 1;
  const pump = {
    id: crypto.randomUUID(),
    code: `P-${String(400 + nextNumber).padStart(3, "0")}`,
    name: "Nueva bomba",
    area: "Sin asignar",
    status: "Operativa",
    measurements: [],
    incidents: [],
  };

  state.pumps = [pump, ...state.pumps];
  state.selectedId = pump.id;
  state.filter = "Todas";
  savePumps();
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
    area: String(form.get("area") ?? "").trim(),
    status: String(form.get("status") ?? "Operativa"),
  };

  state.pumps = state.pumps.map((item) => (item.id === pump.id ? updated : item));
  savePumps();
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
  render();
  showToast("Incidencia añadida.");
}

async function importMeasurements(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const importData = await readMeasureFile(file);
    const result = mergeMeasurements(importData.measurements);
    const viewDataResult = mergeViewDataBlocks(importData.blocks);
    savePumps();
    saveViewDataBlocks();
    if (!result.measurements) {
      state.importMessage = "No se encontraron medidas nuevas. Revisa que la hoja sea viewdata y que tenga Machine Name, OV-Velocity y RMS(mm/s).";
      render();
      showToast("No se encontraron medidas nuevas.");
      return;
    }
    state.importMessage = `Importacion correcta: ${result.measurements} medidas Velocity RMS en ${result.pumps} bombas. Excel historico actualizado con ${viewDataResult.rows} filas completas de ViewData.`;
    render();
    showToast(`${result.measurements} medidas importadas en ${result.pumps} bombas.`);
    downloadHistoryExcel();
  } catch (error) {
    state.importMessage = error.message || "No se pudo importar el archivo.";
    render();
    showToast(error.message || "No se pudo importar el archivo.");
  } finally {
    event.target.value = "";
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
    if (dateColumn === -1 || velocityRmsColumn === -1) return;

    const block = {
      machineName,
      dateColumn,
      valueColumn: velocityRmsColumn,
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
      if (!date || !vibration) continue;

      measurements.push({
        bomba: code,
        punto: point,
        fecha: date,
        fechaHora: dateTime,
        vibracion: vibration,
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

function mergeMeasurements(rows) {
  let importedMeasurements = 0;
  const touchedPumps = new Set();

  for (const row of rows) {
    const normalized = normalizeRow(row);
    if (!normalized.code || !normalized.vibration || !normalized.date) continue;

    let pump = state.pumps.find((item) => item.code.toLowerCase() === normalized.code.toLowerCase());
    if (!pump) {
      pump = {
        id: crypto.randomUUID(),
        code: normalized.code,
        name: normalized.name || normalized.code,
        area: normalized.area || "Importada",
        status: "Operativa",
        measurements: [],
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
      unit: normalized.unit || "mm/s",
      source: "Fluke 805 FC",
    };

    const alreadyExists = pump.measurements.some(
      (item) =>
        item.date === measurement.date &&
        item.dateTime === measurement.dateTime &&
        item.point === measurement.point &&
        Number(item.vibration) === Number(measurement.vibration),
    );
    if (alreadyExists) continue;

    pump.measurements.push(measurement);
    touchedPumps.add(pump.id);
    importedMeasurements += 1;
  }

  state.pumps = state.pumps.map((pump) => {
    if (!touchedPumps.has(pump.id)) return pump;
    return { ...pump, measurements: pump.measurements.sort((a, b) => a.date.localeCompare(b.date)) };
  });

  return { measurements: importedMeasurements, pumps: touchedPumps.size };
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
  window.XLSX.writeFile(workbook, `historico_vibraciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function buildViewDataExportRows() {
  if (state.viewDataBlocks.length) return buildRawViewDataExportRows();

  const rows = [];
  const sortedPumps = [...state.pumps].sort((a, b) => a.code.localeCompare(b.code));

  sortedPumps.forEach((pump) => {
    MEASUREMENT_POINTS.forEach((point) => {
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

function normalizeDate(value) {
  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!match) return raw;
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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

  state.pumps = state.pumps.filter((item) => item.id !== state.pendingDeleteId);
  state.pendingDeleteId = null;
  state.selectedId = state.pumps[0]?.id ?? null;
  savePumps();
  render();
  showToast("Bomba eliminada.");
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

render();
