const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HORIZON_DAYS = 30;
const MAX_CROSSING_DAYS = 90;
const MAX_DAILY_POINTS = 12;

export function analyzePump(pump, options = {}) {
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const warningThreshold = parseThreshold(pump.aviso);
  const alarmThreshold = parseThreshold(pump.alarma);
  const points = [...new Set((pump.measurements || []).map((item) => item.point).filter(Boolean))];
  const pointPredictions = points.map((point) =>
    analyzePoint(pump.measurements || [], point, {
      warningThreshold,
      alarmThreshold,
      horizonDays,
    }),
  );

  const ranked = [...pointPredictions].sort((a, b) => riskScore(b) - riskScore(a));
  const earliestCrossing = ranked
    .flatMap((item) => [item.warningCrossingDays, item.alarmCrossingDays])
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b)[0] ?? null;

  return {
    id: pump.id,
    code: pump.code,
    name: pump.name,
    area: pump.area,
    pumpType: pump.pumpType,
    powerKw: pump.powerKw,
    operationalStatus: pump.status,
    thresholds: { aviso: warningThreshold, alarma: alarmThreshold },
    measurementCount: (pump.measurements || []).length,
    pointPredictions,
    highestRisk: ranked[0]?.riskLevel ?? "sin_datos",
    earliestCrossingDays: earliestCrossing,
    recentMaintenance: [...(pump.maintenanceEvents || [])]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 5),
    recentIncidents: [...(pump.incidents || [])]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 5),
  };
}

export function analyzePoint(measurements, point, options = {}) {
  const warningThreshold = options.warningThreshold ?? null;
  const alarmThreshold = options.alarmThreshold ?? null;
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const series = buildDailySeries(measurements, point).slice(-MAX_DAILY_POINTS);

  if (series.length < 4) return insufficientPrediction(point, series, "menos_de_4_dias");

  const firstTime = series[0].timestamp;
  const x = series.map((item) => (item.timestamp - firstTime) / DAY_MS);
  const y = series.map((item) => item.value);
  const spanDays = x.at(-1) - x[0];
  if (spanDays < 7) return insufficientPrediction(point, series, "periodo_menor_de_7_dias");

  const regression = linearRegression(x, y);
  const latest = series.at(-1);
  const forecastValue = round(Math.max(0, latest.value + regression.slope * horizonDays), 2);
  const confidence = predictionConfidence(series.length, spanDays, regression.r2);
  const warningCrossingDays = thresholdCrossingDays(latest.value, regression.slope, warningThreshold);
  const alarmCrossingDays = thresholdCrossingDays(latest.value, regression.slope, alarmThreshold);
  const mixedFrequency = hasMixedFrequency(series);
  const trend = trendLabel(latest.value, regression.slope, horizonDays);
  const riskLevel = predictionRisk({
    latestValue: latest.value,
    warningThreshold,
    alarmThreshold,
    warningCrossingDays,
    alarmCrossingDays,
    confidence,
    trend,
  });

  return {
    point,
    status: "ok",
    riskLevel,
    trend,
    confidence,
    samples: series.length,
    spanDays: Math.round(spanDays),
    latestDate: latest.date,
    latestValue: round(latest.value, 2),
    slopeMmSPerDay: round(regression.slope, 4),
    r2: round(regression.r2, 2),
    horizonDays,
    forecastValue,
    warningCrossingDays: capCrossing(warningCrossingDays),
    alarmCrossingDays: capCrossing(alarmCrossingDays),
    mixedFrequency,
    dailySeries: series.map((item) => ({ date: item.date, value: round(item.value, 2), frequencyHz: item.frequencyHz })),
  };
}

export function buildDailySeries(measurements, point) {
  const days = new Map();

  for (const item of measurements || []) {
    if (item.point !== point) continue;
    const timestamp = parseMeasurementTime(item.dateTime || item.date);
    const value = Number(item.vibration);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) continue;

    const date = new Date(timestamp).toISOString().slice(0, 10);
    if (!days.has(date)) days.set(date, { values: [], frequencies: [], timestamp: Date.parse(`${date}T00:00:00Z`) });
    const day = days.get(date);
    day.values.push(value);
    const frequency = Number(item.frequencyHz);
    if (Number.isFinite(frequency)) day.frequencies.push(frequency);
  }

  return [...days.entries()]
    .map(([date, day]) => ({
      date,
      timestamp: day.timestamp,
      value: median(day.values),
      frequencyHz: day.frequencies.length ? round(median(day.frequencies), 1) : null,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function buildPredictiveContext(pumps, selectedId, viewDataBlocks = []) {
  const historicalMeasurements = measurementsFromViewDataBlocks(viewDataBlocks);
  const analyses = (pumps || []).map((pump) => {
    const rawMeasurements = historicalMeasurements.filter((item) => samePumpCode(item.code, pump.code));
    const measurements = mergeMeasurements(pump.measurements || [], rawMeasurements);
    return analyzePump({ ...pump, measurements });
  });
  const ranked = [...analyses].sort((a, b) => riskScore(b) - riskScore(a));
  const selected = analyses.find((item) => item.id === selectedId) ?? analyses[0] ?? null;
  const analyzablePoints = analyses.flatMap((item) => item.pointPredictions).filter((item) => item.status === "ok");
  const insufficientPoints = analyses.flatMap((item) => item.pointPredictions).filter((item) => item.status !== "ok");
  const attention = analyzablePoints.filter((item) => !["estable", "descendente"].includes(item.riskLevel));

  return {
    generatedAt: new Date().toISOString(),
    methodology: {
      name: "regresion_lineal_sobre_mediana_diaria",
      forecastHorizonDays: DEFAULT_HORIZON_DAYS,
      maximumCrossingHorizonDays: MAX_CROSSING_DAYS,
      minimumData: "4 dias de medida distribuidos en al menos 7 dias",
      sources: ["datos_de_la_aplicacion", "bloques_viewdata_del_excel_historico"],
      warning: "Estimacion orientativa. No sustituye diagnostico de vibraciones ni decision de parada.",
    },
    portfolioSummary: {
      pumps: analyses.length,
      analyzablePoints: analyzablePoints.length,
      insufficientPoints: insufficientPoints.length,
      pointsRequiringAttention: attention.length,
    },
    portfolio: analyses.map(compactPumpAnalysis),
    attentionPumps: ranked.slice(0, 10).map(compactPumpAnalysis),
    selectedPump: selected,
  };
}

export function measurementsFromViewDataBlocks(blocks) {
  const measurements = [];

  for (const block of blocks || []) {
    const { code, point } = splitMachineName(block.machineName);
    const dateColumn = Number(block.dateColumn);
    const valueColumn = Number(block.valueColumn ?? block.velocityRmsColumn);
    const cfPlusColumn = Number(block.cfPlusColumn);
    if (!code || !point || !Number.isInteger(dateColumn) || !Number.isInteger(valueColumn)) continue;

    for (const row of block.dataRows || []) {
      const dateTime = normalizeHistoricalDate(row?.[dateColumn]);
      const vibration = parseOptionalNumber(row?.[valueColumn]);
      if (!dateTime || vibration === null || vibration <= 0) continue;
      measurements.push({
        code,
        point,
        date: dateTime.slice(0, 10),
        dateTime,
        vibration,
        cfPlus: Number.isInteger(cfPlusColumn) && cfPlusColumn >= 0 ? parseOptionalNumber(row?.[cfPlusColumn]) : null,
        frequencyHz: null,
        source: "excel_historico",
      });
    }
  }

  return measurements;
}

export function mergeMeasurements(currentMeasurements, historicalMeasurements) {
  const merged = [];
  const keys = new Set();

  for (const item of [...(currentMeasurements || []), ...(historicalMeasurements || [])]) {
    const key = measurementKey(item);
    if (!key || keys.has(key)) continue;
    keys.add(key);
    merged.push(item);
  }

  return merged;
}

function compactPumpAnalysis(analysis) {
  return {
    code: analysis.code,
    name: analysis.name,
    area: analysis.area,
    powerKw: analysis.powerKw,
    operationalStatus: analysis.operationalStatus,
    thresholds: analysis.thresholds,
    highestRisk: analysis.highestRisk,
    earliestCrossingDays: analysis.earliestCrossingDays,
    points: analysis.pointPredictions.map(({ dailySeries, ...item }) => item),
  };
}

function insufficientPrediction(point, series, reason) {
  const latest = series.at(-1);
  return {
    point,
    status: "insufficient_data",
    riskLevel: "sin_datos",
    reason,
    samples: series.length,
    latestDate: latest?.date ?? null,
    latestValue: latest ? round(latest.value, 2) : null,
    warningCrossingDays: null,
    alarmCrossingDays: null,
    dailySeries: series.map((item) => ({ date: item.date, value: round(item.value, 2), frequencyHz: item.frequencyHz })),
  };
}

function linearRegression(x, y) {
  const meanX = average(x);
  const meanY = average(y);
  const numerator = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
  const denominator = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const slope = denominator ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  const predicted = x.map((value) => intercept + slope * value);
  const total = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const residual = y.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  const r2 = total ? Math.max(0, 1 - residual / total) : 1;
  return { slope, intercept, r2 };
}

function predictionConfidence(samples, spanDays, r2) {
  if (samples >= 8 && spanDays >= 30 && r2 >= 0.6) return "alta";
  if (samples >= 5 && spanDays >= 14 && r2 >= 0.35) return "media";
  return "baja";
}

function trendLabel(latestValue, slope, horizonDays) {
  const projectedChange = slope * horizonDays;
  const materialChange = Math.max(0.3, Math.abs(latestValue) * 0.1);
  if (projectedChange >= materialChange) return "ascendente";
  if (projectedChange <= -materialChange) return "descendente";
  return "estable";
}

function predictionRisk({ latestValue, warningThreshold, alarmThreshold, warningCrossingDays, alarmCrossingDays, confidence, trend }) {
  if (alarmThreshold !== null && latestValue >= alarmThreshold) return "alarma_actual";
  if (warningThreshold !== null && latestValue >= warningThreshold) return "aviso_actual";
  if (confidence !== "baja" && alarmCrossingDays !== null && alarmCrossingDays <= MAX_CROSSING_DAYS) return "alarma_prevista";
  if (confidence !== "baja" && warningCrossingDays !== null && warningCrossingDays <= MAX_CROSSING_DAYS) return "aviso_previsto";
  if (trend === "ascendente") return "tendencia_ascendente";
  return trend;
}

function thresholdCrossingDays(currentValue, slope, threshold) {
  if (threshold === null) return null;
  if (currentValue >= threshold) return 0;
  if (!Number.isFinite(slope) || slope <= 0) return null;
  const days = (threshold - currentValue) / slope;
  return Number.isFinite(days) && days >= 0 ? Math.ceil(days) : null;
}

function capCrossing(value) {
  return value !== null && value <= MAX_CROSSING_DAYS ? value : null;
}

function hasMixedFrequency(series) {
  const frequencies = series.map((item) => item.frequencyHz).filter(Number.isFinite);
  if (frequencies.length < 3) return false;
  return Math.max(...frequencies) - Math.min(...frequencies) >= 5;
}

function riskScore(item) {
  const risk = item?.riskLevel ?? item?.highestRisk;
  return {
    alarma_actual: 7,
    aviso_actual: 6,
    alarma_prevista: 5,
    aviso_previsto: 4,
    tendencia_ascendente: 3,
    estable: 1,
    descendente: 0,
    sin_datos: -1,
  }[risk] ?? 0;
}

function parseMeasurementTime(value) {
  if (value instanceof Date) return value.getTime();
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const spanish = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (spanish) {
    const [, day, month, year, hour = "00", minute = "00"] = spanish;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return Date.parse(`${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00Z`);
  }
  return Date.parse(raw.replace(" ", "T") + (raw.includes("T") || raw.includes("Z") ? "" : "Z"));
}

function splitMachineName(machineName) {
  const raw = String(machineName ?? "").replace(/^machine name\s*:\s*/i, "").trim();
  const separator = raw.indexOf("/");
  if (separator === -1) return { code: raw, point: "B-LA" };
  return {
    code: raw.slice(0, separator).trim(),
    point: normalizePoint(raw.slice(separator + 1)),
  };
}

function normalizePoint(value) {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "").replaceAll("_", "-");
  const compact = raw.replace(/[^A-Z0-9]/g, "");
  if (compact === "BLA") return "B-LA";
  if (compact === "BLOA") return "B-LOA";
  if (compact === "MLA") return "M-LA";
  if (compact === "MLOA") return "M-LOA";
  if (compact === "MAX") return "M-AX";
  return raw || "B-LA";
}

function normalizeHistoricalDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(Math.round((value - 25569) * DAY_MS)).toISOString();
  }
  const timestamp = parseMeasurementTime(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function samePumpCode(left, right) {
  return String(left ?? "").trim().toLocaleLowerCase() === String(right ?? "").trim().toLocaleLowerCase();
}

function measurementKey(item) {
  const timestamp = parseMeasurementTime(item?.dateTime || item?.date);
  const vibration = parseOptionalNumber(item?.vibration);
  if (!item?.point || !Number.isFinite(timestamp) || vibration === null) return "";
  return `${normalizePoint(item.point)}|${timestamp}|${round(vibration, 4)}`;
}

function parseThreshold(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
