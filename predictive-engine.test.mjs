import assert from "node:assert/strict";
import {
  analyzePoint,
  buildDailySeries,
  buildPredictiveContext,
  measurementsFromViewDataBlocks,
  mergeMeasurements,
} from "./predictive-engine.js";

function measurement(date, vibration, extra = {}) {
  return { point: "B-LA", date, dateTime: `${date} 10:00`, vibration, ...extra };
}

const daily = buildDailySeries([
  measurement("2026-01-01", 1),
  { ...measurement("2026-01-01", 3), dateTime: "2026-01-01 11:00" },
  measurement("2026-01-08", 2),
], "B-LA");
assert.equal(daily.length, 2);
assert.equal(daily[0].value, 2);

const insufficient = analyzePoint([
  measurement("2026-01-01", 1),
  measurement("2026-01-05", 1.2),
  measurement("2026-01-10", 1.4),
], "B-LA", { warningThreshold: 4, alarmThreshold: 6 });
assert.equal(insufficient.status, "insufficient_data");

const risingMeasurements = Array.from({ length: 8 }, (_, index) =>
  measurement(`2026-0${index < 4 ? 1 : 2}-${String(1 + (index % 4) * 10).padStart(2, "0")}`, 2 + index * 0.4),
);
const rising = analyzePoint(risingMeasurements, "B-LA", { warningThreshold: 4, alarmThreshold: 6 });
assert.equal(rising.status, "ok");
assert.equal(rising.trend, "ascendente");
assert.ok(rising.slopeMmSPerDay > 0);
assert.equal(rising.warningCrossingDays, 0);

const stable = analyzePoint([
  measurement("2026-01-01", 2.0),
  measurement("2026-01-10", 2.05),
  measurement("2026-01-20", 1.95),
  measurement("2026-02-01", 2.0),
  measurement("2026-02-10", 2.02),
], "B-LA", { warningThreshold: 4, alarmThreshold: 6 });
assert.equal(stable.trend, "estable");
assert.equal(stable.warningCrossingDays, null);

const context = buildPredictiveContext([
  {
    id: "p1",
    code: "P-1",
    name: "Bomba 1",
    area: "Proceso",
    pumpType: "Centrífuga",
    powerKw: 11,
    status: "Operativa",
    aviso: "4",
    alarma: "6",
    measurements: risingMeasurements,
    maintenanceEvents: [],
    incidents: [],
  },
], "p1");
assert.equal(context.portfolioSummary.pumps, 1);
assert.equal(context.selectedPump.code, "P-1");

const historical = measurementsFromViewDataBlocks([
  {
    machineName: "P-1/B-LA",
    dateColumn: 1,
    valueColumn: 4,
    dataRows: [
      ["", "01/03/2026 10:00", "", "", "3,25"],
      ["", "08/03/2026 10:00", "", "", 3.5],
    ],
  },
]);
assert.equal(historical.length, 2);
assert.equal(historical[0].code, "P-1");
assert.equal(historical[0].point, "B-LA");
assert.equal(historical[0].vibration, 3.25);

const merged = mergeMeasurements(
  [{ point: "B-LA", date: "2026-03-01", dateTime: "2026-03-01 10:00", vibration: 3.25 }],
  historical,
);
assert.equal(merged.length, 2);

const historicalContext = buildPredictiveContext(
  [
    {
      id: "p1",
      code: "P-1",
      name: "Bomba 1",
      aviso: 4,
      alarma: 6,
      measurements: [],
      maintenanceEvents: [],
      incidents: [],
    },
  ],
  "p1",
  [
    {
      machineName: "P-1/B-LA",
      dateColumn: 1,
      valueColumn: 4,
      dataRows: [
        ["", "01/01/2026", "", "", 1],
        ["", "10/01/2026", "", "", 1.2],
        ["", "20/01/2026", "", "", 1.4],
        ["", "01/02/2026", "", "", 1.6],
      ],
    },
  ],
);
assert.equal(historicalContext.selectedPump.measurementCount, 4);
assert.equal(historicalContext.portfolioSummary.analyzablePoints, 1);

console.log("Predictive engine tests passed.");
