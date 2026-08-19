import assert from "node:assert/strict";
import { recommendedThresholds } from "./thresholds.js";

assert.deepEqual(recommendedThresholds(), {
  aviso: 4,
  alarma: 6,
  profile: "Referencia general de planta",
});

console.log("Threshold recommendation tests passed.");
