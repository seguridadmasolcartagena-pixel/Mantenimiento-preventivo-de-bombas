import assert from "node:assert/strict";
import { recommendedThresholds } from "./thresholds.js";

assert.equal(recommendedThresholds("Centrífuga", null, "Acople directo", "Rígida"), null);
assert.equal(recommendedThresholds("Centrífuga", 15, "Acople directo", "Rígida"), null);
assert.equal(recommendedThresholds("Engranajes", 30, "Acople directo", "Rígida"), null);
assert.equal(recommendedThresholds("Centrífuga", 30, "", "Rígida"), null);
assert.deepEqual(recommendedThresholds("Centrífuga", 30, "Acople directo", "Rígida"), {
  aviso: 2.8,
  alarma: 4.5,
  profile: "Grupo 4",
  basis: "Acople directo, fundación rígida, 30 kW",
});
assert.equal(recommendedThresholds("Centrífuga", 30, "Acople directo", "Flexible").aviso, 3.5);
assert.equal(recommendedThresholds("Centrífuga", 30, "Eje intermedio / Poleas", "Rígida").aviso, 3.5);
assert.equal(recommendedThresholds("Centrífuga", 30, "Eje intermedio / Poleas", "Flexible").alarma, 7.1);

console.log("Threshold recommendation tests passed.");
