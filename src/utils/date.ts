const MONTHS_GEDCOM = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function uiDateToGedcom(uiDate: string): string {
    const parts = uiDate.split("/").map(p => p.trim());
    if (parts.length === 3) {
        const [d, m, y] = parts;
        const monthIndex = parseInt(m, 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            return `${parseInt(d, 10)} ${MONTHS_GEDCOM[monthIndex]} ${y}`;
        }
    } else if (parts.length === 2) {
        const [m, y] = parts;
        const monthIndex = parseInt(m, 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            return `${MONTHS_GEDCOM[monthIndex]} ${y}`;
        }
    } else if (parts.length === 1 && parts[0].length === 4) {
        return parts[0];
    }
    return uiDate; // fallback
}

export function gedcomDateToUi(gedDate?: string): string {
    if (!gedDate) return "";
    const parts = gedDate.split(" ").map(p => p.trim());
    if (parts.length === 3) {
        const [d, m, y] = parts;
        const monthIndex = MONTHS_GEDCOM.indexOf(m.toUpperCase());
        if (monthIndex >= 0) {
            const mm = String(monthIndex + 1).padStart(2, "0");
            const dd = String(parseInt(d, 10)).padStart(2, "0");
            return `${dd}/${mm}/${y}`;
        }
    } else if (parts.length === 2) {
        const [m, y] = parts;
        const monthIndex = MONTHS_GEDCOM.indexOf(m.toUpperCase());
        if (monthIndex >= 0) {
            const mm = String(monthIndex + 1).padStart(2, "0");
            return `${mm}/${y}`;
        }
    } else if (parts.length === 1 && parts[0].length === 4) {
        return parts[0];
    }
    return gedDate; // fallback
}
