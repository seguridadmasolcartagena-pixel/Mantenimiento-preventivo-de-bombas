const PUMP_REFERENCE_THRESHOLDS = {
  "Acople directo|Rígida": { aviso: 2.8, alarma: 4.5, group: "Grupo 4" },
  "Acople directo|Flexible": { aviso: 3.5, alarma: 4.5, group: "Grupo 4" },
  "Eje intermedio / Poleas|Rígida": { aviso: 3.5, alarma: 4.5, group: "Grupo 3" },
  "Eje intermedio / Poleas|Flexible": { aviso: 4.5, alarma: 7.1, group: "Grupo 3" },
};

export function recommendedThresholds(pumpType, powerKw, driveType, foundationType) {
  const power = Number(powerKw);
  if (pumpType !== "Centrífuga" || !Number.isFinite(power) || power <= 15) return null;

  const reference = PUMP_REFERENCE_THRESHOLDS[`${driveType}|${foundationType}`];
  if (!reference) return null;

  return {
    aviso: reference.aviso,
    alarma: reference.alarma,
    profile: reference.group,
    basis: `${driveType}, fundación ${foundationType.toLowerCase()}, ${formatPower(power)} kW`,
  };
}

function formatPower(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
