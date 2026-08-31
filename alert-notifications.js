(() => {
  const SAVE_FLOW_KEY = "gestor-bombas-config-save-flow-url";
  const STANDARD_POINTS = ["B-LA", "B-LOA", "M-LA", "M-LOA"];
  const PISTON_POINTS = ["M-LA", "M-LOA", "R", "A", "B"];

  function parseThreshold(value) {
    const number = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function parseOptionalNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(String(value).replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  function measurementPointsForPump(pump) {
    const isPiston = String(pump.pumpType || "").toLowerCase().includes("pist");
    const points = isPiston ? PISTON_POINTS : STANDARD_POINTS;
    return pump.hasAxialMeasurement ? [...points, "M-AX"] : [...points];
  }

  function compareMeasurements(a, b) {
    const aDate = a.dateTime || a.date || "";
    const bDate = b.dateTime || b.date || "";
    return String(aDate).localeCompare(String(bDate));
  }

  function latestMeasurementsByPoint(pump) {
    const points = measurementPointsForPump(pump);
    const latest = Object.fromEntries(points.map((point) => [point, null]));
    for (const item of [...(pump.measurements || [])].sort(compareMeasurements)) {
      if (points.includes(item.point)) latest[item.point] = item;
    }
    return latest;
  }

  function triggeredMeasurements(pump) {
    const latestByPoint = latestMeasurementsByPoint(pump);
    const vibrationWarning = parseThreshold(pump.aviso);
    const vibrationAlarm = parseThreshold(pump.alarma);
    const cfPlusWarning = parseThreshold(pump.cfPlusAviso);
    const cfPlusAlarm = parseThreshold(pump.cfPlusAlarma);
    const triggered = [];

    for (const point of measurementPointsForPump(pump)) {
      const item = latestByPoint[point];
      if (!item) continue;

      const vibration = Number(item.vibration);
      if (Number.isFinite(vibration)) {
        if (vibrationAlarm !== null && vibration >= vibrationAlarm) {
          triggered.push({ metric: "Vibración", point, value: vibration, unit: item.unit || "mm/s", date: item.date || "", thresholdType: "Alarma", threshold: vibrationAlarm });
        } else if (vibrationWarning !== null && vibration >= vibrationWarning) {
          triggered.push({ metric: "Vibración", point, value: vibration, unit: item.unit || "mm/s", date: item.date || "", thresholdType: "Aviso", threshold: vibrationWarning });
        }
      }

      const cfPlus = parseOptionalNumber(item.cfPlus);
      if (cfPlus !== null) {
        if (cfPlusAlarm !== null && cfPlus >= cfPlusAlarm) {
          triggered.push({ metric: "CF+", point, value: cfPlus, unit: "CF+", date: item.date || "", thresholdType: "Alarma", threshold: cfPlusAlarm });
        } else if (cfPlusWarning !== null && cfPlus >= cfPlusWarning) {
          triggered.push({ metric: "CF+", point, value: cfPlus, unit: "CF+", date: item.date || "", thresholdType: "Aviso", threshold: cfPlusWarning });
        }
      }
    }
    return triggered;
  }

  function calculatedPumpStatus(pump) {
    if (pump.status === "Parada" || pump.status === "Mantenimiento") return pump.status;
    const triggered = triggeredMeasurements(pump);
    if (triggered.some((item) => item.thresholdType === "Alarma")) return "Alarma";
    if (triggered.some((item) => item.thresholdType === "Aviso")) return "Aviso";
    return pump.status === "Aviso" || pump.status === "Alarma" ? pump.status : "Operativa";
  }

  function pumpAlert(pump) {
    const status = calculatedPumpStatus(pump);
    if (status !== "Aviso" && status !== "Alarma") return null;

    const triggeredPoints = triggeredMeasurements(pump);
    if (!triggeredPoints.length) return null;

    const metrics = [...new Set(triggeredPoints.map((item) => item.metric))];
    const headline = [...triggeredPoints].sort((a, b) => {
      const severity = Number(b.thresholdType === "Alarma") - Number(a.thresholdType === "Alarma");
      if (severity !== 0) return severity;
      return String(b.date).localeCompare(String(a.date));
    })[0];

    return {
      id: pump.id,
      code: pump.code,
      name: `${pump.name} · ${metrics.join(" y ")}`,
      area: pump.area,
      status,
      aviso: pump.aviso ?? "",
      alarma: pump.alarma ?? "",
      cfPlusAviso: pump.cfPlusAviso ?? "",
      cfPlusAlarma: pump.cfPlusAlarma ?? "",
      alertMetric: metrics.join(" y "),
      triggeredPoints,
      highestValue: Number(headline.value),
      highestUnit: headline.unit,
      latestDate: triggeredPoints.map((item) => item.date).sort().at(-1) || "",
    };
  }

  function withAlerts(body) {
    const data = JSON.parse(body);
    if (!Array.isArray(data?.pumps)) return body;
    return JSON.stringify({ ...data, alerts: data.pumps.map(pumpAlert).filter(Boolean) });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = (resource, options = {}) => {
    const saveUrl = localStorage.getItem(SAVE_FLOW_KEY);
    const url = typeof resource === "string" ? resource : resource?.url;
    const body = options?.body;
    if (saveUrl && url === saveUrl && typeof body === "string") {
      try {
        return originalFetch(resource, { ...options, body: withAlerts(body) });
      } catch {
        return originalFetch(resource, options);
      }
    }
    return originalFetch(resource, options);
  };
})();