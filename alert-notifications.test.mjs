import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./alert-notifications.js", import.meta.url), "utf8");

async function alertsFor({ vibration = 2, cfPlus = null }) {
  let payload = null;
  const window = {
    fetch: async (_resource, options) => {
      payload = JSON.parse(options.body);
      return { ok: true };
    },
  };
  const localStorage = { getItem: () => "https://flow.example/save" };
  vm.runInNewContext(source, { window, localStorage, console });
  await window.fetch("https://flow.example/save", {
    body: JSON.stringify({
      pumps: [{
        id: "1", code: "P-1", name: "Bomba", area: "Proceso", status: "Operativa",
        pumpType: "Centrífuga", aviso: "4", alarma: "6", cfPlusAviso: "11", cfPlusAlarma: "13",
        measurements: [{ point: "B-LA", vibration, cfPlus, date: "2026-08-31", unit: "mm/s" }],
      }],
    }),
  });
  return payload.alerts;
}

assert.equal((await alertsFor({ cfPlus: 10 })).length, 0);
assert.equal((await alertsFor({ cfPlus: 11 }))[0].status, "Aviso");
assert.equal((await alertsFor({ cfPlus: 11 }))[0].alertMetric, "CF+");
assert.equal((await alertsFor({ cfPlus: 12 }))[0].status, "Aviso");
assert.equal((await alertsFor({ cfPlus: 13 }))[0].status, "Alarma");
assert.equal((await alertsFor({ vibration: 6, cfPlus: 10 }))[0].alertMetric, "Vibración");
assert.equal((await alertsFor({ vibration: 6, cfPlus: 13 }))[0].alertMetric, "Vibración y CF+");

console.log("alert-notifications tests passed");