import assert from "node:assert/strict";
import { clampPanelGeometry, extractFlowAnswer, updateChatFormAvailability } from "./predictive-chat.js";

assert.equal(extractFlowAnswer({ respuesta: "Analisis directo" }), "Analisis directo");
assert.equal(extractFlowAnswer({ answer: "Respuesta alternativa" }), "Respuesta alternativa");
assert.equal(
  extractFlowAnswer({ properties: { outputs: { body: { respuesta: "Analisis asincrono" } } } }),
  "Analisis asincrono",
);
assert.equal(extractFlowAnswer({ outputs: { body: "Texto del flujo" } }), "Texto del flujo");
assert.equal(
  extractFlowAnswer({
    id: "resp_123",
    output: [
      { type: "reasoning", content: [] },
      { type: "message", content: [{ type: "output_text", text: "Respuesta nativa de OpenAI" }] },
    ],
  }),
  "Respuesta nativa de OpenAI",
);
assert.equal(
  extractFlowAnswer(JSON.stringify({ ok: true, respuesta: "Respuesta JSON serializada" })),
  "Respuesta JSON serializada",
);
assert.equal(
  extractFlowAnswer({ body: { response: { output: [{ type: "message", content: [{ type: "output_text", text: "Respuesta envuelta" }] }] } } }),
  "Respuesta envuelta",
);
assert.equal(extractFlowAnswer({}), "");

assert.deepEqual(
  clampPanelGeometry({ left: -100, top: 900, width: 900, height: 900 }, { width: 800, height: 600 }),
  { left: 8, top: 8, width: 784, height: 584 },
);
assert.deepEqual(
  clampPanelGeometry({ left: 120, top: 80, width: 600, height: 480 }, { width: 1200, height: 900 }),
  { left: 120, top: 80, width: 600, height: 480 },
);

const textarea = { disabled: true };
const submitButton = { disabled: false };
const attributes = new Map();
const classes = new Set();
const form = {
  querySelector(selector) {
    return selector === "textarea" ? textarea : submitButton;
  },
  setAttribute(name, value) {
    attributes.set(name, value);
  },
  classList: {
    toggle(name, enabled) {
      if (enabled) classes.add(name);
      else classes.delete(name);
    },
  },
};

updateChatFormAvailability(form, true);
assert.equal(textarea.disabled, false, "El campo debe seguir disponible mientras responde la IA");
assert.equal(submitButton.disabled, true, "No se deben enviar dos solicitudes simultaneas");
assert.equal(attributes.get("aria-busy"), "true");
assert.equal(classes.has("is-busy"), true);

updateChatFormAvailability(form, false);
assert.equal(textarea.disabled, false);
assert.equal(submitButton.disabled, false);
assert.equal(attributes.get("aria-busy"), "false");
assert.equal(classes.has("is-busy"), false);

console.log("Predictive chat tests passed.");
