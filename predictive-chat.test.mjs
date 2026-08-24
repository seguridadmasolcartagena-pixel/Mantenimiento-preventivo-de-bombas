import assert from "node:assert/strict";
import { extractFlowAnswer } from "./predictive-chat.js";

assert.equal(extractFlowAnswer({ respuesta: "Analisis directo" }), "Analisis directo");
assert.equal(extractFlowAnswer({ answer: "Respuesta alternativa" }), "Respuesta alternativa");
assert.equal(
  extractFlowAnswer({ properties: { outputs: { body: { respuesta: "Analisis asincrono" } } } }),
  "Analisis asincrono",
);
assert.equal(extractFlowAnswer({ outputs: { body: "Texto del flujo" } }), "Texto del flujo");
assert.equal(extractFlowAnswer({}), "");

console.log("Predictive chat tests passed.");
