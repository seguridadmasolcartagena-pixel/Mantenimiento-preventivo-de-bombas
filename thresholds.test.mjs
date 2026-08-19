import assert from "node:assert/strict";
import { recommendedThresholds } from "./thresholds.js";

assert.equal(recommendedThresholds("Centrífuga", null, "Acople directo"), null);
assert.equal(recommendedThresholds("Centrífuga", 15, "Acople directo"), null);
assert.equal(recommendedThresholds("Engranajes", 30, "Acople directo"), null);
assert.equal(recommendedThresholds("Centrífuga", 30, ""), null);
assert.deepEqual(recommendedThresholds("Centrífuga", 30, "Acople directo"), {
  aviso: 2.8,
  alarma: 4.5,
  profile: "Grupo 4",
  basis: "Acople directo, fundación rígida, 30 kW",
});
assert.deepEqual(recommendedThresholds("Centrífuga", 30, "Eje intermedio / Poleas"), {
  aviso: 3.5,
  alarma: 4.5,
  profile: "Grupo 3",
  basis: "Eje intermedio / Poleas, fundación rígida, 30 kW",
});

console.log("Threshold recommendation tests passed.");
