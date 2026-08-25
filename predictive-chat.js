const FLOW_URL_KEY = "gestor-bombas-predictive-chat-flow-url";
const CHAT_HISTORY_KEY = "gestor-bombas-predictive-chat-history";
const CONVERSATION_ID_KEY = "gestor-bombas-predictive-chat-conversation-id";
const CHAT_GEOMETRY_KEY = "gestor-bombas-predictive-chat-geometry";
const MAX_HISTORY_MESSAGES = 10;
const DIRECT_REQUEST_TIMEOUT_MS = 125000;
const ASYNC_MAX_WAIT_MS = 5 * 60 * 1000;
const DEFAULT_POLL_DELAY_MS = 3000;

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
    <button class="predictive-chat-launcher" type="button" aria-label="Abrir asistente predictivo" aria-expanded="false" title="Abrir asistente predictivo">IA</button>
    <section class="predictive-chat-panel" aria-label="Asistente predictivo" hidden>
      <header class="predictive-chat-header" title="Arrastra para mover la ventana">
        <div>
          <strong>Asistente predictivo</strong>
          <span id="predictiveChatCoverage"></span>
        </div>
        <div class="predictive-chat-header-actions">
          <button type="button" data-chat-action="scroll-up" aria-label="Subir en la conversación" title="Subir en la conversación">↑</button>
          <button type="button" data-chat-action="scroll-down" aria-label="Bajar en la conversación" title="Bajar en la conversación">↓</button>
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
      <div class="predictive-chat-messages" id="predictiveChatMessages" aria-live="polite" aria-label="Historial de conversación" tabindex="0"></div>
      <form class="predictive-chat-form" id="predictiveChatForm">
        <textarea name="question" rows="2" maxlength="1200" placeholder="Pregunta sobre bombas y tendencias" required></textarea>
        <button type="submit" aria-label="Enviar pregunta" title="Enviar">↑</button>
      </form>
    </section>
  `;
  document.body.append(root);

  const panel = root.querySelector(".predictive-chat-panel");
  root.querySelector(".predictive-chat-launcher")?.addEventListener("click", togglePanel);
  root.querySelector("[data-chat-action='close']")?.addEventListener("click", closePanel);
  root.querySelector("[data-chat-action='cancel-config']")?.addEventListener("click", closeConfiguration);
  root.querySelector("[data-chat-action='scroll-up']")?.addEventListener("click", () => scrollMessages(-1));
  root.querySelector("[data-chat-action='scroll-down']")?.addEventListener("click", () => scrollMessages(1));
  root.querySelector("#predictiveChatConfig")?.addEventListener("submit", saveConfiguration);
  root.querySelector("#predictiveChatForm")?.addEventListener("submit", sendQuestion);
  panel?.querySelector(".predictive-chat-header")?.addEventListener("pointerdown", startPanelDrag);
  if (panel && "ResizeObserver" in window) {
    new ResizeObserver(() => persistPanelGeometry(panel)).observe(panel);
  }
  window.addEventListener("resize", () => keepPanelInViewport(panel));
  renderMessages();
}

function togglePanel() {
  const panel = document.querySelector(".predictive-chat-panel");
  if (!panel || panel.hidden) openPanel();
  else closePanel();
}

function openPanel() {
  const panel = document.querySelector(".predictive-chat-panel");
  if (!panel) return;
  restorePanelGeometry(panel);
  panel.hidden = false;
  document.body.classList.add("predictive-chat-open");
  updateLauncherState(true);
  updateCoverage();
  if (!messages.length) {
    const summary = getContext()?.portfolioSummary;
    messages = [{ role: "assistant", content: initialSummary(summary) }];
    persistMessages();
    renderMessages();
  }
  window.requestAnimationFrame(() => {
    keepPanelInViewport(panel);
    panel.querySelector("textarea")?.focus();
  });
}

function closePanel() {
  const panel = document.querySelector(".predictive-chat-panel");
  if (panel) panel.hidden = true;
  document.body.classList.remove("predictive-chat-open");
  updateLauncherState(false);
}

function updateLauncherState(open) {
  const launcher = document.querySelector(".predictive-chat-launcher");
  if (!launcher) return;
  launcher.setAttribute("aria-expanded", String(open));
  launcher.setAttribute("aria-label", open ? "Cerrar asistente predictivo" : "Abrir asistente predictivo");
  launcher.title = open ? "Cerrar asistente predictivo" : "Abrir asistente predictivo";
}

function startPanelDrag(event) {
  if (event.button !== 0 || event.target.closest("button, input, textarea")) return;
  const header = event.currentTarget;
  const panel = header.closest(".predictive-chat-panel");
  if (!panel || isCompactViewport()) return;

  event.preventDefault();
  const rect = panel.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  panel.style.left = `${rect.left}px`;
  panel.style.top = `${rect.top}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.width = `${rect.width}px`;
  panel.style.height = `${rect.height}px`;
  panel.classList.add("is-dragging");
  header.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const geometry = clampPanelGeometry({
      left: moveEvent.clientX - offsetX,
      top: moveEvent.clientY - offsetY,
      width: panel.offsetWidth,
      height: panel.offsetHeight,
    }, { width: window.innerWidth, height: window.innerHeight });
    panel.style.left = `${geometry.left}px`;
    panel.style.top = `${geometry.top}px`;
  };
  const stop = () => {
    panel.classList.remove("is-dragging");
    header.removeEventListener("pointermove", move);
    header.removeEventListener("pointerup", stop);
    header.removeEventListener("pointercancel", stop);
    persistPanelGeometry(panel);
  };

  header.addEventListener("pointermove", move);
  header.addEventListener("pointerup", stop);
  header.addEventListener("pointercancel", stop);
}

export function clampPanelGeometry(geometry, viewport) {
  const margin = 8;
  const maxWidth = Math.max(0, Number(viewport?.width || 0) - margin * 2);
  const maxHeight = Math.max(0, Number(viewport?.height || 0) - margin * 2);
  const minWidth = Math.min(380, maxWidth);
  const minHeight = Math.min(360, maxHeight);
  const width = clamp(Number(geometry?.width) || 680, minWidth, maxWidth);
  const height = clamp(Number(geometry?.height) || 700, minHeight, maxHeight);
  return {
    left: clamp(Number(geometry?.left) || margin, margin, Math.max(margin, maxWidth - width + margin)),
    top: clamp(Number(geometry?.top) || margin, margin, Math.max(margin, maxHeight - height + margin)),
    width,
    height,
  };
}

function keepPanelInViewport(panel) {
  if (!panel || panel.hidden) return;
  if (isCompactViewport()) {
    clearPanelGeometryStyles(panel);
    return;
  }
  const rect = panel.getBoundingClientRect();
  const geometry = clampPanelGeometry(rect, { width: window.innerWidth, height: window.innerHeight });
  panel.style.left = `${geometry.left}px`;
  panel.style.top = `${geometry.top}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.width = `${geometry.width}px`;
  panel.style.height = `${geometry.height}px`;
}

function restorePanelGeometry(panel) {
  if (isCompactViewport()) {
    clearPanelGeometryStyles(panel);
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_GEOMETRY_KEY) || "null");
    if (!saved) return;
    const geometry = clampPanelGeometry(saved, { width: window.innerWidth, height: window.innerHeight });
    panel.style.left = `${geometry.left}px`;
    panel.style.top = `${geometry.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${geometry.width}px`;
    panel.style.height = `${geometry.height}px`;
  } catch {
    localStorage.removeItem(CHAT_GEOMETRY_KEY);
  }
}

function persistPanelGeometry(panel) {
  if (!panel || panel.hidden || isCompactViewport()) return;
  const rect = panel.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  try {
    localStorage.setItem(CHAT_GEOMETRY_KEY, JSON.stringify({
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }));
  } catch {
    // The window remains movable when local storage is unavailable.
  }
}

function clearPanelGeometryStyles(panel) {
  for (const property of ["left", "top", "right", "bottom", "width", "height"]) {
    panel.style.removeProperty(property);
  }
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
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
  sessionStorage.removeItem(CONVERSATION_ID_KEY);
  closeConfiguration();
  appendMessage("assistant", "Conexión del asistente actualizada. Se iniciará una conversación nueva.");
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

  try {
    const context = getContext() || {};
    const history = messages
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-MAX_HISTORY_MESSAGES - 1, -1)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }));
    const conversationId = loadConversationId();
    const response = await fetchWithTimeout(flowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje: question,
        bomba: getPumpCode(context),
        conversationId,
        pregunta: question,
        historial: history,
        contexto: context,
        usuario: "gestor-bombas",
      }),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    }, DIRECT_REQUEST_TIMEOUT_MS);
    const result = await resolveFlowResponse(response);
    const answer = extractFlowAnswer(result);
    if (!answer) throw new Error("El flujo no devolvió el campo respuesta.");

    const nextConversationId = extractConversationId(result);
    if (nextConversationId) persistConversationId(nextConversationId);

    appendMessage("assistant", answer);
  } catch (error) {
    const message = error.name === "AbortError"
      ? "Power Automate no devolvió una respuesta en 125 segundos. Activa la respuesta asíncrona del flujo para análisis más largos."
      : error.message;
    appendMessage("assistant", `No se pudo completar el análisis: ${message}`);
  } finally {
    setBusy(false);
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function resolveFlowResponse(response) {
  if (response.status === 202) return pollAsyncFlow(response);

  const payload = await readResponsePayload(response);
  if (!response.ok) throw new Error(flowErrorMessage(response.status, payload));
  return unwrapFlowPayload(payload);
}

async function pollAsyncFlow(initialResponse) {
  const location = initialResponse.headers.get("Location");
  if (!location) {
    throw new Error("Power Automate aceptó el análisis, pero no devolvió la URL de seguimiento asíncrono.");
  }

  const deadline = Date.now() + ASYNC_MAX_WAIT_MS;
  let delayMs = retryDelay(initialResponse);

  while (Date.now() < deadline) {
    await delay(delayMs);
    const remainingMs = Math.max(1000, deadline - Date.now());
    const response = await fetchWithTimeout(location, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    }, Math.min(30000, remainingMs));

    if (response.status === 202) {
      delayMs = retryDelay(response);
      continue;
    }

    const payload = await readResponsePayload(response);
    if (!response.ok) throw new Error(flowErrorMessage(response.status, payload));
    return unwrapFlowPayload(payload);
  }

  throw new Error("El análisis sigue en curso después de cinco minutos. Revisa la ejecución en Power Automate.");
}

async function readResponsePayload(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function unwrapFlowPayload(payload) {
  return payload?.properties?.outputs?.body ?? payload?.outputs?.body ?? payload?.body ?? payload;
}

export function extractFlowAnswer(payload) {
  const result = unwrapFlowPayload(payload);
  if (typeof result === "string") {
    const text = result.trim();
    if (!text) return "";
    try {
      return extractFlowAnswer(JSON.parse(text)) || text;
    } catch {
      return text;
    }
  }

  const directAnswer = result?.respuesta ?? result?.answer ?? result?.output_text;
  if (typeof directAnswer === "string" && directAnswer.trim()) return directAnswer.trim();

  const response = result?.response ?? result;
  const output = Array.isArray(response?.output) ? response.output : [];
  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    const textPart = item.content.find((part) => part?.type === "output_text" && typeof part.text === "string");
    if (textPart?.text?.trim()) return textPart.text.trim();
  }
  return "";
}

function extractConversationId(payload) {
  const result = unwrapFlowPayload(payload);
  return String(result?.conversationId ?? result?.conversation_id ?? "").trim();
}

function flowErrorMessage(status, payload) {
  const result = unwrapFlowPayload(payload);
  const detail = typeof result === "string"
    ? result
    : result?.error?.message ?? result?.message ?? result?.error?.code ?? "";
  const safeDetail = sanitizeErrorDetail(detail);
  return safeDetail ? `Power Automate respondió con estado ${status}: ${safeDetail}` : `Power Automate respondió con estado ${status}.`;
}

function sanitizeErrorDetail(value) {
  return String(value ?? "")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[CLAVE OCULTA]")
    .replace(/https?:\/\/\S+/g, "[URL OCULTA]")
    .slice(0, 600)
    .trim();
}

function retryDelay(response) {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) ? Math.min(10000, Math.max(1000, seconds * 1000)) : DEFAULT_POLL_DELAY_MS;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function scrollMessages(direction) {
  const container = document.querySelector("#predictiveChatMessages");
  if (!container) return;
  const distance = Math.max(180, Math.round(container.clientHeight * 0.75));
  container.scrollBy({ top: distance * direction, behavior: "smooth" });
  container.focus({ preventScroll: true });
}

function getPumpCode(context) {
  const candidates = [
    context?.selectedPump?.code,
    context?.pump?.code,
    context?.pumpCode,
    context?.selectedPumpCode,
  ];
  return String(candidates.find((value) => value !== undefined && value !== null && String(value).trim()) || "").trim();
}

function loadConversationId() {
  try {
    return sessionStorage.getItem(CONVERSATION_ID_KEY) || "";
  } catch {
    return "";
  }
}

function persistConversationId(value) {
  try {
    sessionStorage.setItem(CONVERSATION_ID_KEY, value);
  } catch {
    // The chat continues without conversation persistence if session storage is unavailable.
  }
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
  updateChatFormAvailability(form, value);
  renderMessages();
  if (!value) {
    window.requestAnimationFrame(() => form?.querySelector("textarea")?.focus({ preventScroll: true }));
  }
}

export function updateChatFormAvailability(form, waiting) {
  if (!form) return;
  const textarea = form.querySelector("textarea");
  const submitButton = form.querySelector("button[type='submit']");
  form.setAttribute("aria-busy", String(waiting));
  form.classList.toggle("is-busy", waiting);
  if (textarea) textarea.disabled = false;
  if (submitButton) submitButton.disabled = waiting;
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
