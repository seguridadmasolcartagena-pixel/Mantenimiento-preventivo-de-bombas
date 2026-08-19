import assert from "node:assert/strict";
import { recommendedThresholds } from "./thresholds.js";

assert.equal(recommendedThresholds("Centrífuga", null), null);
assert.deepEqual(recommendedThresholds("Centrífuga", 11), {
  aviso: 1.8,
  alarma: 4.5,
  profile: "Clase I",
  basis: "Centrífuga, 11 kW",
});
assert.equal(recommendedThresholds("Centrífuga", 30).aviso, 2.8);
assert.equal(recommendedThresholds("Centrífuga", 90).alarma, 11.2);
assert.equal(recommendedThresholds("Engranajes", 7.5).aviso, 2.8);
assert.equal(recommendedThresholds("Pistón", 7.5).alarma, 11.2);

console.log("Threshold recommendation tests passed.");
