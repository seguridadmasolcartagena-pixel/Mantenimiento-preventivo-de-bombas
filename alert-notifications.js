(() => {
  const SAVE_FLOW_KEY = "gestor-bombas-config-save-flow-url";
  const MEASUREMENT_POINTS = ["B-LA", "B-LOA", "M-LA", "M-LOA"];

  function parseThreshold(value) {
    const number = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function compareMeasurements(a, b) {
    const aDate = a.dateTime || a.date || "";
    const bDate = b.dateTime || b.date || "";
    return String(aDate).localeCompare(String(bDate));
  }

  function latestMeasurementsByPoint(pump) {
    const latest = Object.fromEntries(MEASUREMENT_POINTS.map((point) => [point, null]));
    for (const item of [...(pump.measurements || [])].sort(compareMeasurements)) {
      if (MEASUREMENT_POINTS.includes(item.point)) latest[item.point] = item;
    }
    return latest;
  }

  function calculatedPumpStatus(pump) {
    if (pump.status === "Parada") return "Parada";

    const latestValues = Object.values(latestMeasurementsByPoint(pump))
      .filter(Boolean)
      .map((item) => Number(item.vibration))
      .filter((value) => Number.isFinite(value));
    const alarmThreshold = parseThreshold(pump.alarma);
    const warningThreshold = parseThreshold(pump.aviso);

    if (alarmThreshold !== null && latestValues.some((value) => value > alarmThreshold)) return "Alarma";
    if (warningThreshold !== null && latestValues.some((value) => value > warningThreshold)) return "Aviso";
    return pump.status === "Aviso" || pump.status === "Alarma" ? pump.status : "Operativa";
  }

  function pumpAlert(pump) {
    const status = calculatedPumpStatus(pump);
    if (status !== "Aviso" && status !== "Alarma") return null;

    const latestByPoint = latestMeasurementsByPoint(pump);
    const warningThreshold = parseThreshold(pump.aviso);
    const alarmThreshold = parseThreshold(pump.alarma);
    const triggeredPoints = MEASUREMENT_POINTS.map((point) => {
      const item = latestByPoint[point];
      const value = Number(item?.vibration);
      if (!item || !Number.isFinite(value)) return null;

      if (alarmThreshold !== null && value > alarmThreshold) {
        return { point, value, unit: item.unit || "mm/s", date: item.date || "", thresholdType: "Alarma", threshold: alarmThreshold };
      }
      if (warningThreshold !== null && value > warningThreshold) {
        return { point, value, unit: item.unit || "mm/s", date: item.date || "", thresholdType: "Aviso", threshold: warningThreshold };
      }
      return null;
    }).filter(Boolean);

    if (!triggeredPoints.length) return null;

    return {
      id: pump.id,
      code: pump.code,
      name: pump.name,
      area: pump.area,
      status,
      aviso: pump.aviso ?? "",
      alarma: pump.alarma ?? "",
      triggeredPoints,
      highestValue: Math.max(...triggeredPoints.map((item) => Number(item.value))),
      latestDate: triggeredPoints.map((item) => item.date).sort().at(-1) || "",
    };
  }

  function withAlerts(body) {
    const data = JSON.parse(body);
    if (!Array.isArray(data?.pumps)) return body;

    return JSON.stringify({
      ...data,
      alerts: data.pumps.map(pumpAlert).filter(Boolean),
    });
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