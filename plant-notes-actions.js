(() => {
  const PLANT_NOTES_STORAGE_KEY = "gestor-bombas-plant-notes-v1";
  const PUMPS_STORAGE_KEY = "gestor-bombas-v3";
  const LOCAL_UPDATED_AT_KEY = "gestor-bombas-local-updated-at-v1";
  const FEEDBACK_KEY = "gestor-bombas-record-actions-feedback";
  const MAX_PLANT_NOTES = 100;
  let scheduled = false;

  function parseStoredArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function loadNotes() {
    return parseStoredArray(PLANT_NOTES_STORAGE_KEY).slice(0, MAX_PLANT_NOTES);
  }

  function loadPumps() {
    return parseStoredArray(PUMPS_STORAGE_KEY);
  }

  function saveRecordData(key, value, feedback) {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(LOCAL_UPDATED_AT_KEY, new Date().toISOString());
    sessionStorage.setItem(FEEDBACK_KEY, feedback);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function noteRecords() {
    return loadNotes()
      .map((note, sourceIndex) => ({ note, sourceIndex }))
      .filter(({ note }) => String(note?.text ?? "").trim())
      .sort((a, b) => String(b.note?.createdAt ?? "").localeCompare(String(a.note?.createdAt ?? "")))
      .slice(0, MAX_PLANT_NOTES);
  }

  function enhanceNotes() {
    const articles = [...document.querySelectorAll(".plant-notes-list .plant-note")];
    if (!articles.length) return;

    const records = noteRecords();
    articles.forEach((article, index) => {
      const record = records[index];
      if (!record) return;

      const noteId = String(record.note?.id ?? "");
      const actionKey = noteId || `index-${record.sourceIndex}`;
      if (article.dataset.noteActionsReady === actionKey) return;

      article.dataset.noteActionsReady = actionKey;
      article.dataset.noteId = noteId;
      article.dataset.noteSourceIndex = String(record.sourceIndex);

      const footer = article.querySelector("footer");
      if (!footer) return;
      footer.querySelector(".plant-note-actions")?.remove();

      const actions = document.createElement("span");
      actions.className = "plant-note-actions";
      actions.innerHTML = `
        <button class="plant-note-action edit" type="button" data-plant-note-edit aria-label="Editar mensaje del tablón" title="Editar mensaje">Editar</button>
        <button class="plant-note-action delete" type="button" data-plant-note-delete aria-label="Borrar mensaje del tablón" title="Borrar mensaje">Borrar</button>
      `;
      footer.append(actions);
    });
  }

  function findNote(ref) {
    const notes = loadNotes();
    if (ref.id) {
      const byId = notes.findIndex((note) => String(note?.id ?? "") === ref.id);
      if (byId >= 0) return { notes, index: byId, note: notes[byId] };
    }

    const index = Number(ref.sourceIndex);
    if (Number.isInteger(index) && index >= 0 && index < notes.length) {
      return { notes, index, note: notes[index] };
    }
    return null;
  }

  function noteRefFromButton(button) {
    const article = button.closest(".plant-note");
    return {
      id: String(article?.dataset.noteId ?? ""),
      sourceIndex: String(article?.dataset.noteSourceIndex ?? ""),
    };
  }

  function selectedPumpId() {
    return String(document.querySelector(".pump-row.active[data-select]")?.dataset.select ?? "");
  }

  function incidentRecords() {
    const pumpId = selectedPumpId();
    if (!pumpId) return [];
    const pump = loadPumps().find((item) => String(item?.id ?? "") === pumpId);
    if (!pump || !Array.isArray(pump.incidents)) return [];

    return pump.incidents
      .map((incident, sourceIndex) => ({ incident, sourceIndex }))
      .sort((a, b) => String(b.incident?.date ?? "").localeCompare(String(a.incident?.date ?? "")));
  }

  function enhanceIncidents() {
    const articles = [...document.querySelectorAll(".incident-list .incident")];
    if (!articles.length) return;

    const records = incidentRecords();
    articles.forEach((article, index) => {
      const record = records[index];
      if (!record) return;

      const incidentId = String(record.incident?.id ?? "");
      const actionKey = incidentId || `index-${record.sourceIndex}`;
      if (article.dataset.incidentActionsReady === actionKey) return;

      article.dataset.incidentActionsReady = actionKey;
      article.dataset.incidentId = incidentId;
      article.dataset.incidentSourceIndex = String(record.sourceIndex);

      article.querySelector(".incident-actions")?.remove();
      const actions = document.createElement("div");
      actions.className = "incident-actions";
      actions.innerHTML = `
        <button class="button secondary button-small" type="button" data-incident-edit>Editar</button>
        <button class="button danger button-small" type="button" data-incident-delete>Borrar</button>
      `;
      article.append(actions);
    });
  }

  function incidentRefFromButton(button) {
    const article = button.closest(".incident");
    return {
      pumpId: selectedPumpId(),
      id: String(article?.dataset.incidentId ?? ""),
      sourceIndex: String(article?.dataset.incidentSourceIndex ?? ""),
    };
  }

  function findIncident(ref) {
    const pumps = loadPumps();
    const pumpIndex = pumps.findIndex((pump) => String(pump?.id ?? "") === ref.pumpId);
    if (pumpIndex < 0) return null;

    const incidents = Array.isArray(pumps[pumpIndex].incidents) ? pumps[pumpIndex].incidents : [];
    let incidentIndex = -1;
    if (ref.id) {
      incidentIndex = incidents.findIndex((incident) => String(incident?.id ?? "") === ref.id);
    }
    if (incidentIndex < 0) {
      const sourceIndex = Number(ref.sourceIndex);
      if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < incidents.length) {
        incidentIndex = sourceIndex;
      }
    }
    if (incidentIndex < 0) return null;

    return {
      pumps,
      pumpIndex,
      incidents,
      incidentIndex,
      incident: incidents[incidentIndex],
    };
  }

  function enhanceMaintenanceActions() {
    document.querySelectorAll("[data-edit-maintenance]").forEach((button) => {
      button.textContent = "Editar";
      button.title = "Editar mantenimiento";
    });
    document.querySelectorAll("[data-delete-maintenance]").forEach((button) => {
      button.textContent = "Borrar";
      button.title = "Borrar mantenimiento";
    });
  }

  function closeModal() {
    document.querySelector(".record-actions-backdrop")?.remove();
  }

  function appendModal(content) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop record-actions-backdrop";
    backdrop.innerHTML = content;
    document.body.append(backdrop);
    return backdrop;
  }

  function openEditNoteModal(ref) {
    const found = findNote(ref);
    if (!found) return;

    const backdrop = appendModal(`
      <section class="confirm-modal record-edit-modal" role="dialog" aria-modal="true" aria-labelledby="plantNoteEditTitle">
        <button class="modal-close" type="button" data-record-modal-close aria-label="Cerrar">x</button>
        <p class="eyebrow">Tablón de planta</p>
        <h3 id="plantNoteEditTitle">Editar mensaje</h3>
        <form class="record-edit-form" id="plantNoteEditForm">
          <label>
            Nombre o turno
            <input class="field" name="author" maxlength="60" value="${escapeHtml(found.note?.author ?? "")}" required />
          </label>
          <label>
            Mensaje
            <textarea class="field" name="text" maxlength="500" rows="6" required>${escapeHtml(found.note?.text ?? "")}</textarea>
          </label>
          <div class="modal-actions">
            <button class="button secondary" type="button" data-record-modal-close>Cancelar</button>
            <button class="button" type="submit">Guardar cambios</button>
          </div>
        </form>
      </section>
    `);

    backdrop.querySelector("#plantNoteEditForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const current = findNote(ref);
      if (!current) return closeModal();

      const data = new FormData(event.currentTarget);
      const author = String(data.get("author") ?? "").trim().slice(0, 60);
      const text = String(data.get("text") ?? "").trim().slice(0, 500);
      if (!author || !text) return;

      current.notes[current.index] = { ...current.note, author, text };
      saveRecordData(PLANT_NOTES_STORAGE_KEY, current.notes.slice(0, MAX_PLANT_NOTES), "Mensaje del tablón editado.");
      closeModal();
      window.location.reload();
    });

    backdrop.querySelector("textarea")?.focus();
  }

  function openDeleteNoteModal(ref) {
    const found = findNote(ref);
    if (!found) return;
    const preview = String(found.note?.text ?? "").trim();

    const backdrop = appendModal(`
      <section class="confirm-modal record-edit-modal" role="dialog" aria-modal="true" aria-labelledby="plantNoteDeleteTitle">
        <p class="eyebrow">Confirmación</p>
        <h3 id="plantNoteDeleteTitle">¿Borrar este mensaje del tablón?</h3>
        <p>${escapeHtml(preview.length > 180 ? `${preview.slice(0, 180)}…` : preview)}</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" data-record-modal-close>Cancelar</button>
          <button class="button danger" type="button" id="confirmPlantNoteDelete">Borrar mensaje</button>
        </div>
      </section>
    `);

    backdrop.querySelector("#confirmPlantNoteDelete")?.addEventListener("click", () => {
      const current = findNote(ref);
      if (!current) return closeModal();
      current.notes.splice(current.index, 1);
      saveRecordData(PLANT_NOTES_STORAGE_KEY, current.notes.slice(0, MAX_PLANT_NOTES), "Mensaje del tablón borrado.");
      closeModal();
      window.location.reload();
    });
  }

  function openEditIncidentModal(ref) {
    const found = findIncident(ref);
    if (!found) return;
    const incident = found.incident || {};
    const severity = String(incident.severity || "Leve");

    const backdrop = appendModal(`
      <section class="confirm-modal record-edit-modal incident-edit-modal" role="dialog" aria-modal="true" aria-labelledby="incidentEditTitle">
        <button class="modal-close" type="button" data-record-modal-close aria-label="Cerrar">x</button>
        <p class="eyebrow">Incidencia</p>
        <h3 id="incidentEditTitle">Editar incidencia</h3>
        <form class="record-edit-form" id="incidentEditForm">
          <div class="record-edit-grid">
            <label>
              Fecha
              <input class="field" name="date" type="date" value="${escapeHtml(incident.date || "")}" required />
            </label>
            <label>
              Gravedad
              <select class="field" name="severity">
                ${["Leve", "Media", "Alta"].map((value) => `<option value="${value}" ${severity === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
          </div>
          <label>
            Título
            <input class="field" name="title" maxlength="160" value="${escapeHtml(incident.title || "")}" required />
          </label>
          <label>
            Descripción
            <textarea class="field" name="description" maxlength="1000" rows="6">${escapeHtml(incident.description || "")}</textarea>
          </label>
          <div class="modal-actions">
            <button class="button secondary" type="button" data-record-modal-close>Cancelar</button>
            <button class="button" type="submit">Guardar cambios</button>
          </div>
        </form>
      </section>
    `);

    backdrop.querySelector("#incidentEditForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const current = findIncident(ref);
      if (!current) return closeModal();

      const data = new FormData(event.currentTarget);
      const updatedIncident = {
        ...current.incident,
        date: String(data.get("date") ?? "").trim(),
        severity: String(data.get("severity") ?? "Leve"),
        title: String(data.get("title") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
      };
      if (!updatedIncident.date || !updatedIncident.title) return;

      current.incidents[current.incidentIndex] = updatedIncident;
      current.pumps[current.pumpIndex] = { ...current.pumps[current.pumpIndex], incidents: current.incidents };
      saveRecordData(PUMPS_STORAGE_KEY, current.pumps, "Incidencia editada.");
      closeModal();
      window.location.reload();
    });
  }

  function openDeleteIncidentModal(ref) {
    const found = findIncident(ref);
    if (!found) return;
    const title = String(found.incident?.title ?? "Incidencia");

    const backdrop = appendModal(`
      <section class="confirm-modal record-edit-modal" role="dialog" aria-modal="true" aria-labelledby="incidentDeleteTitle">
        <p class="eyebrow">Confirmación</p>
        <h3 id="incidentDeleteTitle">¿Borrar esta incidencia?</h3>
        <p>Se borrará <strong>${escapeHtml(title)}</strong> de la ficha de esta bomba.</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" data-record-modal-close>Cancelar</button>
          <button class="button danger" type="button" id="confirmIncidentDelete">Borrar incidencia</button>
        </div>
      </section>
    `);

    backdrop.querySelector("#confirmIncidentDelete")?.addEventListener("click", () => {
      const current = findIncident(ref);
      if (!current) return closeModal();
      current.incidents.splice(current.incidentIndex, 1);
      current.pumps[current.pumpIndex] = { ...current.pumps[current.pumpIndex], incidents: current.incidents };
      saveRecordData(PUMPS_STORAGE_KEY, current.pumps, "Incidencia borrada.");
      closeModal();
      window.location.reload();
    });
  }

  function showPendingFeedback() {
    const feedback = sessionStorage.getItem(FEEDBACK_KEY);
    if (!feedback) return;
    const toast = document.querySelector("#toast");
    if (!toast) return;

    sessionStorage.removeItem(FEEDBACK_KEY);
    toast.textContent = feedback;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function enhanceAll() {
    enhanceNotes();
    enhanceIncidents();
    enhanceMaintenanceActions();
    showPendingFeedback();
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceAll();
    });
  }

  document.addEventListener("click", (event) => {
    const noteEdit = event.target.closest("[data-plant-note-edit]");
    if (noteEdit) {
      event.preventDefault();
      openEditNoteModal(noteRefFromButton(noteEdit));
      return;
    }

    const noteDelete = event.target.closest("[data-plant-note-delete]");
    if (noteDelete) {
      event.preventDefault();
      openDeleteNoteModal(noteRefFromButton(noteDelete));
      return;
    }

    const incidentEdit = event.target.closest("[data-incident-edit]");
    if (incidentEdit) {
      event.preventDefault();
      openEditIncidentModal(incidentRefFromButton(incidentEdit));
      return;
    }

    const incidentDelete = event.target.closest("[data-incident-delete]");
    if (incidentDelete) {
      event.preventDefault();
      openDeleteIncidentModal(incidentRefFromButton(incidentDelete));
      return;
    }

    if (event.target.closest("[data-record-modal-close]")) {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.target.classList.contains("record-actions-backdrop")) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleEnhance();
})();
