import assert from "node:assert/strict";
import { extractFlowAnswer } from "./predictive-chat.js";

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

console.log("Predictive chat tests passed.");
