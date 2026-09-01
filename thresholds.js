export function recommendedThresholds() {
  return {
    aviso: 4,
    alarma: 6,
    profile: "Referencia general de planta",
  };
}

export function recommendedCfPlusThresholds() {
  return {
    aviso: 11,
    alarma: 13,
    profile: "Referencia CF+ de planta",
  };
}

export function normalizeCfPlusAlarm(value, { migrateLegacy = false } = {}) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return String(recommendedCfPlusThresholds().alarma);
  if (migrateLegacy && Number(normalized) === 16) return String(recommendedCfPlusThresholds().alarma);
  return normalized;
}
