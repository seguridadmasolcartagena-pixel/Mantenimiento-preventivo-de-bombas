import assert from "node:assert/strict";
import { normalizeCfPlusAlarm, recommendedCfPlusThresholds, recommendedThresholds } from "./thresholds.js";

assert.deepEqual(recommendedThresholds(), {
  aviso: 4,
  alarma: 6,
  profile: "Referencia general de planta",
});

assert.deepEqual(recommendedCfPlusThresholds(), {
  aviso: 11,
  alarma: 13,
  profile: "Referencia CF+ de planta",
});
assert.equal(normalizeCfPlusAlarm(""), "13");
assert.equal(normalizeCfPlusAlarm("16", { migrateLegacy: true }), "13");
assert.equal(normalizeCfPlusAlarm("16"), "16");
assert.equal(normalizeCfPlusAlarm("14", { migrateLegacy: true }), "14");

console.log("Threshold recommendation tests passed.");
