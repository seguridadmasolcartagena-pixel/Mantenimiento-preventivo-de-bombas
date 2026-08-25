(() => {
  const PLANT_NOTES_STORAGE_KEY = "gestor-bombas-plant-notes-v1";
  const LOCAL_UPDATED_AT_KEY = "gestor-bombas-local-updated-at-v1";
  const FEEDBACK_KEY = "gestor-bombas-plant-notes-feedback";
  const MAX_PLANT_NOTES = 100;
  let scheduled = false;

  function loadNotes() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PLANT_NOTES_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, MAX_PLANT_NOTES) : [];
    } catch {
      return [];
    }
  }

  function noteRecords() {
    return loadNotes()
      .map((note, sourceIndex) => ({ note, sourceIndex }))
      .filter(({ note }) => String(note?.text ?? "").trim())
      .sort((a, b) => String(b.note?.createdAt ?? "").localeCompare(String(a.note?.createdAt ?? "")))
      .slice(0, MAX_PLANT_NOTES);
  }

  function saveNotes(notes, feedback) {
    localStorage.setItem(PLANT_NOTES_STORAGE_KEY, JSON.stringify(notes.slice(0, MAX_PLANT_NOTES)));
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

  function closeModal() {
    document.querySelector(".plant-note-editor-backdrop")?.remove();
  }

  function openEditModal(ref) {
    const found = findNote(ref);
    if (!found) return;

    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop plant-note-editor-backdrop";
    backdrop.innerHTML = `
      <section class="confirm-modal plant-note-edit-modal" role="dialog" aria-modal="true" aria-labelledby="plantNoteEditTitle">
        <button class="modal-close" type="button" data-plant-note-modal-close aria-label="Cerrar">x</button>
        <p class="eyebrow">Tablón de planta</p>
        <h3 id="plantNoteEditTitle">Editar mensaje</h3>
        <form class="plant-note-edit-form" id="plantNoteEditForm">
          <label>
            Nombre o turno
            <input class="field" name="author" maxlength="60" value="${escapeHtml(found.note?.author ?? "")}" required />
          </label>
          <label>
            Mensaje
            <textarea class="field" name="text" maxlength="500" rows="6" required>${escapeHtml(found.note?.text ?? "")}</textarea>
          </label>
          <div class="modal-actions">
            <button class="button secondary" type="button" data-plant-note-modal-close>Cancelar</button>
            <button class="button" type="submit">Guardar cambios</button>
          </div>
        </form>
      </section>
    `;
    document.body.append(backdrop);

    backdrop.querySelector("#plantNoteEditForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const current = findNote(ref);
      if (!current) {
        closeModal();
        return;
      }

      const data = new FormData(event.currentTarget);
      const author = String(data.get("author") ?? "").trim().slice(0, 60);
      const text = String(data.get("text") ?? "").trim().slice(0, 500);
      if (!author || !text) return;

      current.notes[current.index] = {
        ...current.note,
        author,
        text,
      };
      saveNotes(current.notes, "Mensaje del tablón editado.");
      closeModal();
      window.location.reload();
    });

    backdrop.querySelector("textarea")?.focus();
  }

  function openDeleteModal(ref) {
    const found = findNote(ref);
    if (!found) return;

    closeModal();
    const preview = String(found.note?.text ?? "").trim();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop plant-note-editor-backdrop";
    backdrop.innerHTML = `
      <section class="confirm-modal plant-note-edit-modal" role="dialog" aria-modal="true" aria-labelledby="plantNoteDeleteTitle">
        <p class="eyebrow">Confirmación</p>
        <h3 id="plantNoteDeleteTitle">¿Borrar este mensaje del tablón?</h3>
        <p class="plant-note-delete-preview">${escapeHtml(preview.length > 180 ? `${preview.slice(0, 180)}…` : preview)}</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" data-plant-note-modal-close>Cancelar</button>
          <button class="button danger" type="button" id="confirmPlantNoteDelete">Borrar mensaje</button>
        </div>
      </section>
    `;
    document.body.append(backdrop);

    backdrop.querySelector("#confirmPlantNoteDelete")?.addEventListener("click", () => {
      const current = findNote(ref);
      if (!current) {
        closeModal();
        return;
      }
      current.notes.splice(current.index, 1);
      saveNotes(current.notes, "Mensaje del tablón borrado.");
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
      enhanceNotes();
      showPendingFeedback();
    });
  }

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-plant-note-edit]");
    if (editButton) {
      event.preventDefault();
      openEditModal(noteRefFromButton(editButton));
      return;
    }

    const deleteButton = event.target.closest("[data-plant-note-delete]");
    if (deleteButton) {
      event.preventDefault();
      openDeleteModal(noteRefFromButton(deleteButton));
      return;
    }

    if (event.target.closest("[data-plant-note-modal-close]")) {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.target.classList.contains("plant-note-editor-backdrop")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleEnhance();
})();
