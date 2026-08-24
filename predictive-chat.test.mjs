import assert from "node:assert/strict";
import { clampPanelGeometry, extractFlowAnswer } from "./predictive-chat.js";

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

console.log("Predictive chat tests passed.");
