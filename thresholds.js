const SEVERITY_CLASSES = [
  { name: "Clase I", aviso: 1.8, alarma: 4.5 },
  { name: "Clase II", aviso: 2.8, alarma: 7.1 },
  { name: "Clase III", aviso: 4.5, alarma: 11.2 },
];

const MINIMUM_CLASS_BY_TYPE = {
  "Centrífuga": 0,
  Engranajes: 1,
  Tornillo: 1,
  "Lóbulos": 1,
  "Pistón": 2,
  Diafragma: 2,
  Otra: 0,
};

export function recommendedThresholds(pumpType, powerKw) {
  const power = Number(powerKw);
  if (!Number.isFinite(power) || power <= 0) return null;

  const powerClass = power <= 15 ? 0 : power <= 75 ? 1 : 2;
  const typeClass = MINIMUM_CLASS_BY_TYPE[pumpType] ?? 0;
  const severityClass = SEVERITY_CLASSES[Math.max(powerClass, typeClass)];

  return {
    aviso: severityClass.aviso,
    alarma: severityClass.alarma,
    profile: severityClass.name,
    basis: `${pumpType || "Otra"}, ${formatPower(power)} kW`,
  };
}

function formatPower(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
