(() => {
  const PUMPS_STORAGE_KEY = "gestor-bombas-v3";
  const LOCAL_UPDATED_AT_KEY = "gestor-bombas-local-updated-at-v1";
  const FEEDBACK_KEY = "gestor-bombas-incident-actions-feedback";
  let scheduled = false;

  function loadPumps() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PUMPS_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function savePumps(pumps, feedback) {
    localStorage.setItem(PUMPS_STORAGE_KEY, JSON.stringify(pumps));
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

  function selectedPumpInfo() {
    const pumps = loadPumps();
    const activeId = String(document.querySelector(".pump-row.active[data-select]")?.dataset.select ?? "");
    let pumpIndex = activeId ? pumps.findIndex((pump) => String(pump?.id ?? "") === activeId) : -1;

    if (pumpIndex < 0) {
      const code = String(document.querySelector("#pumpForm input[name='code']")?.value ?? "").trim().toLowerCase();
      if (code) pumpIndex = pumps.findIndex((pump) => String(pump?.code ?? "").trim().toLowerCase() === code);
    }

    if (pumpIndex < 0) return null;
    return { pumps, pumpIndex, pump: pumps[pumpIndex] };
  }

  function sortedIncidentRecords(pump) {
    const incidents = Array.isArray(pump?.incidents) ? pump.incidents : [];
    return incidents
      .map((incident, sourceIndex) => ({ incident, sourceIndex }))
      .sort((a, b) => String(b.incident?.date ?? "").localeCompare(String(a.incident?.date ?? "")));
  }

  function incidentFromArticle(article) {
    const selected = selectedPumpInfo();
    if (!selected) return null;

    const articles = [...document.querySelectorAll(".incident-list .incident")];
    const position = articles.indexOf(article);
    if (position < 0) return null;

    const record = sortedIncidentRecords(selected.pump)[position];
    if (!record) return null;

    return {
      ...selected,
      incidents: Array.isArray(selected.pump.incidents) ? [...selected.pump.incidents] : [],
      incident: record.incident,
      incidentIndex: record.sourceIndex,
    };
  }

  function enhanceIncidents() {
    document.querySelectorAll(".incident-list .incident").forEach((article) => {
      if (article.querySelector(".incident-actions [data-incident-direct-edit]")) return;

      article.querySelector(".incident-actions")?.remove();
      const actions = document.createElement("div");
      actions.className = "incident-actions";
      actions.innerHTML = `
        <button class="button secondary button-small" type="button" data-incident-direct-edit>Editar</button>
        <button class="button danger button-small" type="button" data-incident-direct-delete>Borrar</button>
      `;
      article.append(actions);
    });
  }

  function closeModal() {
    document.querySelector(".incident-direct-backdrop")?.remove();
  }

  function appendModal(content) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop incident-direct-backdrop";
    backdrop.innerHTML = content;
    document.body.append(backdrop);
    return backdrop;
  }

  function openEditModal(article) {
    const found = incidentFromArticle(article);
    if (!found) return;

    const incident = found.incident || {};
    const severity = String(incident.severity || "Leve");
    const backdrop = appendModal(`
      <section class="confirm-modal record-edit-modal incident-edit-modal" role="dialog" aria-modal="true" aria-labelledby="incidentDirectEditTitle">
        <button class="modal-close" type="button" data-incident-direct-close aria-label="Cerrar">x</button>
        <p class="eyebrow">Incidencia</p>
        <h3 id="incidentDirectEditTitle">Editar incidencia</h3>
        <form class="record-edit-form" id="incidentDirectEditForm">
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
            <button class="button secondary" type="button" data-incident-direct-close>Cancelar</button>
            <button class="button" type="submit">Guardar cambios</button>
          </div>
        </form>
      </section>
    `);

    backdrop.querySelector("#incidentDirectEditForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const current = incidentFromArticle(article) || found;
      const data = new FormData(event.currentTarget);
      const updated = {
        ...current.incident,
        date: String(data.get("date") ?? "").trim(),
        severity: String(data.get("severity") ?? "Leve"),
        title: String(data.get("title") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
      };
      if (!updated.date || !updated.title) return;

      current.incidents[current.incidentIndex] = updated;
      current.pumps[current.pumpIndex] = { ...current.pump, incidents: current.incidents };
      savePumps(current.pumps, "Incidencia editada.");
      closeModal();
      window.location.reload();
    });
  }

  function openDeleteModal(article) {
    const found = incidentFromArticle(article);
    if (!found) return;

    const backdrop = appendModal(`
      <section class="confirm-modal record-edit-modal" role="dialog" aria-modal="true" aria-labelledby="incidentDirectDeleteTitle">
        <p class="eyebrow">Confirmación</p>
        <h3 id="incidentDirectDeleteTitle">¿Borrar esta incidencia?</h3>
        <p>Se borrará <strong>${escapeHtml(found.incident?.title || "Incidencia")}</strong> de la ficha de esta bomba.</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" data-incident-direct-close>Cancelar</button>
          <button class="button danger" type="button" id="confirmIncidentDirectDelete">Borrar incidencia</button>
        </div>
      </section>
    `);

    backdrop.querySelector("#confirmIncidentDirectDelete")?.addEventListener("click", () => {
      const current = incidentFromArticle(article) || found;
      current.incidents.splice(current.incidentIndex, 1);
      current.pumps[current.pumpIndex] = { ...current.pump, incidents: current.incidents };
      savePumps(current.pumps, "Incidencia borrada.");
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

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceIncidents();
      showPendingFeedback();
    });
  }

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-incident-direct-edit]");
    if (editButton) {
      event.preventDefault();
      openEditModal(editButton.closest(".incident"));
      return;
    }

    const deleteButton = event.target.closest("[data-incident-direct-delete]");
    if (deleteButton) {
      event.preventDefault();
      openDeleteModal(deleteButton.closest(".incident"));
      return;
    }

    if (event.target.closest("[data-incident-direct-close]")) {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.target.classList.contains("incident-direct-backdrop")) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  new MutationObserver(scheduleEnhance).observe(document.documentElement, { childList: true, subtree: true });
  scheduleEnhance();
})();
