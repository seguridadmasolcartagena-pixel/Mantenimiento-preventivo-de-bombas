(() => {
  function normalizeSpanishDateText(value) {
    const text = String(value ?? "").trim();
    const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!match) return null;

    const [, day, month, year, hour = "00", minute = "00"] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return `${date} ${hour.padStart(2, "0")}:${minute}`;
  }

  function normalizeWorkbookDates(workbook) {
    for (const sheetName of workbook.SheetNames || []) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      Object.keys(sheet).forEach((address) => {
        if (address.startsWith("!")) return;

        const cell = sheet[address];
        const normalized = normalizeSpanishDateText(cell?.w ?? cell?.v);
        if (!normalized) return;

        cell.t = "s";
        cell.v = normalized;
        cell.w = normalized;
      });
    }
  }

  function installPatch() {
    if (!window.XLSX?.read || window.XLSX.__spanishDatePatch) return;

    const originalRead = window.XLSX.read.bind(window.XLSX);
    window.XLSX.read = (...args) => {
      const workbook = originalRead(...args);
      normalizeWorkbookDates(workbook);
      return workbook;
    };
    window.XLSX.__spanishDatePatch = true;
  }

  installPatch();
  window.addEventListener("load", installPatch);
})();