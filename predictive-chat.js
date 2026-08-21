const FLOW_URL_KEY = "gestor-bombas-predictive-chat-flow-url";
const CHAT_HISTORY_KEY = "gestor-bombas-predictive-chat-history";
const MAX_HISTORY_MESSAGES = 10;

let mounted = false;
let getContext = () => ({});
let messages = loadMessages();
let busy = false;

export function mountPredictiveChat(options = {}) {
  getContext = typeof options.getContext === "function" ? options.getContext : getContext;
  if (mounted) return;
  mounted = true;

  const root = document.createElement("div");
  root.id = "predictiveChatRoot";
  root.innerHTML = `
    <button class="predictive-chat-launcher" type="button" aria-label="Abrir asistente predictivo" title="Asistente predictivo">IA</button>
    <section class="predictive-chat-panel" aria-label="Asistente predictivo" hidden>
      <header class="predictive-chat-header">
        <div>
          <strong>Asistente predictivo</strong>
          <span id="predictiveChatCoverage"></span>
        </div>
        <div class="predictive-chat-header-actions">
          <button type="button" data-chat-action="configure">Configurar</button>
          <button type="button" data-chat-action="close" aria-label="Cerrar asistente">×</button>
        </div>
      </header>
      <form class="predictive-chat-config" id="predictiveChatConfig" hidden>
        <label>
          URL del flujo Power Automate
          <input type="url" name="flowUrl" placeholder="https://..." autocomplete="off" />
        </label>
        <span>Introduce solo la URL del flujo. La clave de OpenAI permanece en Power Automate.</span>
        <div>
          <button type="button" data-chat-action="cancel-config">Cancelar</button>
          <button type="submit">Guardar</button>
        </div>
      </form>
      <div class="predictive-chat-messages" id="predictiveChatMessages" aria-live="polite"></div>
      <form class="predictive-chat-form" id="predictiveChatForm">
        <textarea name="question" rows="2" maxlength="1200" placeholder="Pregunta sobre bombas y tendencias" required></textarea>
        <button type="submit" aria-label="Enviar pregunta" title="Enviar">↑</button>
      </form>
    </section>
  `;
  document.body.append(root);

  root.querySelector(".predictive-chat-launcher")?.addEventListener("click", openPanel);
  root.querySelector("[data-chat-action='close']")?.addEventListener("click", closePanel);
  root.querySelector("[data-chat-action='configure']")?.addEventListener("click", openConfiguration);
  root.querySelector("[data-chat-action='cancel-config']")?.addEventListener("click", closeConfiguration);
  root.querySelector("#predictiveChatConfig")?.addEventListener("submit", saveConfiguration);
  root.querySelector("#predictiveChatForm")?.addEventListener("submit", sendQuestion);
  renderMessages();
}

function openPanel() {
  const panel = document.querySelector(".predictive-chat-panel");
  if (!panel) return;
  panel.hidden = false;
  document.body.classList.add("predictive-chat-open");
  updateCoverage();
  if (!messages.length) {
    const summary = getContext()?.portfolioSummary;
    messages = [{ role: "assistant", content: initialSummary(summary) }];
    persistMessages();
    renderMessages();
  }
  panel.querySelector("textarea")?.focus();
}

function closePanel() {
  const panel = document.querySelector(".predictive-chat-panel");
  if (panel) panel.hidden = true;
  document.body.classList.remove("predictive-chat-open");
}

function openConfiguration() {
  const form = document.querySelector("#predictiveChatConfig");
  if (!form) return;
  form.hidden = false;
  form.elements.flowUrl.value = localStorage.getItem(FLOW_URL_KEY) || "";
  form.elements.flowUrl.focus();
}

function closeConfiguration() {
  const form = document.querySelector("#predictiveChatConfig");
  if (form) form.hidden = true;
}

function saveConfiguration(event) {
  event.preventDefault();
  const url = String(new FormData(event.currentTarget).get("flowUrl") || "").trim();
  if (!isSecureUrl(url)) {
    appendMessage("assistant", "La URL del flujo debe comenzar por https://");
    return;
  }
  localStorage.setItem(FLOW_URL_KEY, url);
  closeConfiguration();
  appendMessage("assistant", "Conexión del asistente actualizada.");
}

async function sendQuestion(event) {
  event.preventDefault();
  if (busy) return;

  const form = event.currentTarget;
  const question = String(new FormData(form).get("question") || "").trim();
  if (!question) return;
  const flowUrl = localStorage.getItem(FLOW_URL_KEY) || "";
  if (!isSecureUrl(flowUrl)) {
    openConfiguration();
    appendMessage("assistant", "Configura primero la URL HTTPS del flujo Power Automate.");
    return;
  }

  appendMessage("user", question);
  form.reset();
  setBusy(true);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 100000);
  try {
    const history = messages
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-MAX_HISTORY_MESSAGES - 1, -1)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }));
    const response = await fetch(flowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pregunta: question,
        historial: history,
        contexto: getContext(),
        usuario: "gestor-bombas",
      }),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`El flujo respondió con estado ${response.status}.`);
    const result = await response.json();
    const answer = String(result.respuesta || result.answer || "").trim();
    if (!answer) throw new Error("El flujo no devolvió el campo respuesta.");
    appendMessage("assistant", answer);
  } catch (error) {
    const message = error.name === "AbortError" ? "La consulta ha superado el tiempo de espera." : error.message;
    appendMessage("assistant", `No se pudo completar el análisis: ${message}`);
  } finally {
    window.clearTimeout(timeout);
    setBusy(false);
  }
}

function appendMessage(role, content) {
  messages.push({ role, content, createdAt: new Date().toISOString() });
  messages = messages.slice(-20);
  persistMessages();
  renderMessages();
}

function renderMessages() {
  const container = document.querySelector("#predictiveChatMessages");
  if (!container) return;
  container.replaceChildren();
  for (const item of messages) {
    const message = document.createElement("div");
    message.className = `predictive-chat-message ${item.role}`;
    message.textContent = item.content;
    container.append(message);
  }
  if (busy) {
    const waiting = document.createElement("div");
    waiting.className = "predictive-chat-message assistant waiting";
    waiting.textContent = "Analizando histórico y tendencias...";
    container.append(waiting);
  }
  container.scrollTop = container.scrollHeight;
}

function updateCoverage() {
  const summary = getContext()?.portfolioSummary;
  const label = document.querySelector("#predictiveChatCoverage");
  if (!label) return;
  label.textContent = summary
    ? `${summary.pumps} bombas · ${summary.analyzablePoints} puntos analizables`
    : "Sin datos disponibles";
}

function initialSummary(summary) {
  if (!summary) return "No hay datos disponibles para analizar.";
  return `${summary.pumps} bombas revisadas. ${summary.analyzablePoints} puntos tienen histórico suficiente y ${summary.insufficientPoints} todavía no permiten una predicción.`;
}

function setBusy(value) {
  busy = value;
  const form = document.querySelector("#predictiveChatForm");
  if (form) {
    form.querySelector("textarea").disabled = value;
    form.querySelector("button").disabled = value;
  }
  renderMessages();
}

function persistMessages() {
  try {
    sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  } catch {
    // The chat continues without persistence if session storage is unavailable.
  }
}

function loadMessages() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
}

function isSecureUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
