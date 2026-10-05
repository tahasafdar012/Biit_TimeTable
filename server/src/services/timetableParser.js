// services/timetableParser.js
// Position-based timetable parser (pdfjs-dist). Works on Buffer/Uint8Array/file path.

const fs = require('fs');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ENTRY_RE = /^(.+?)\s*\((.+)\)_(\S+)$/; // Subject (Teacher, Teacher)_Room

async function loadPdfjs() {
  // pdfjs-dist is ESM-only; dynamic import works from CommonJS too.
  return import('pdfjs-dist/legacy/build/pdf.mjs');
}

function splitTeachers(s) {
  return s.split(',').map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function cleanText(items) {
  items.sort((a, b) => (Math.abs(a.top - b.top) > 2 ? a.top - b.top : a.x - b.x));
  return items.map(i => i.str).join(' ').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
}

async function parseTimetable(input) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(typeof input === 'string' ? fs.readFileSync(input) : input);
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;

  const sections = [];
  const entries = [];
  const warnings = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const H = page.getViewport({ scale: 1 }).height;
    const tc = await page.getTextContent();

    // pdfjs sometimes fuses text from two neighbouring cells into ONE item.
    // A room suffix followed (optionally after a space) by a capital letter is
    // always a cell boundary, so split there and spread the pieces across the
    // item's width proportionally to character count.
    const FUSED = /(_(?:DLDLab|MLTLab|Lab\d+|Lt\d+|Online))\s*(?=[A-Z])/;
    const items = [];
    for (const i of tc.items) {
      if (!i.str || !i.str.trim()) continue;
      const str = i.str.trim();
      const x0 = i.transform[4], w = i.width || 0, top = H - i.transform[5];
      const parts = str.split(FUSED).reduce((acc, seg, idx) => {
        if (idx % 2 === 1) acc[acc.length - 1] += seg; else acc.push(seg);
        return acc;
      }, []);
      let used = 0;
      for (const part of parts) {
        const px = x0 + (w * used) / str.length;
        const pw = (w * part.length) / str.length;
        items.push({ str: part.trim(), x: px, xc: px + pw / 2, top });
        used += part.length;
      }
    }

    // 1. "Time Table:XYZ" titles anchor each table on the page, top to bottom.
    const titles = items
      .filter(i => /^Time\b/.test(i.str) || /^Table:/.test(i.str))
      .sort((a, b) => a.top - b.top);
    const tableAnchors = [];
    for (const t of titles) {
      const full = items
        .filter(i => Math.abs(i.top - t.top) < 2 && i.x < 300 && i.x >= t.x - 1)
        .sort((a, b) => a.x - b.x)
        .map(i => i.str)
        .join(' ');
      const m = full.match(/Time\s*Table:\s*(.+)$/);
      if (m && !tableAnchors.some(a => Math.abs(a.top - t.top) < 2)) {
        tableAnchors.push({ name: m[1].trim(), top: t.top });
      }
    }
    tableAnchors.sort((a, b) => a.top - b.top);

    // 2. Column edges measured from the PDF's drawn grid: time col | 5 day cols.
    const EDGES = [0, 105.5, 203.5, 301.5, 399.4, 497.3, 700];

    for (let ti = 0; ti < tableAnchors.length; ti++) {
      const { name, top } = tableAnchors[ti];
      const bottom = ti + 1 < tableAnchors.length ? tableAnchors[ti + 1].top : H;
      const inTable = items.filter(i => i.top > top + 1 && i.top < bottom - 1);

      // 3. Row bands from the time labels in the first column.
      const labelItems = inTable.filter(i => i.xc < EDGES[1]);
      const byLine = new Map();
      for (const i of labelItems) {
        const key = Math.round(i.top / 3);
        if (!byLine.has(key)) byLine.set(key, []);
        byLine.get(key).push(i);
      }
      const rows = [];
      for (const its of byLine.values()) {
        its.sort((a, b) => a.x - b.x);
        const txt = its.map(i => i.str).join('').replace(/\s+/g, ' ');
        const m = txt.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (m) rows.push({ start: m[1], end: m[2], center: its[0].top });
      }
      rows.sort((a, b) => a.center - b.center);
      if (rows.length < 2) {
        warnings.push(`p${p} ${name}: could not find time rows`);
        continue;
      }
      const rowH = rows[1].center - rows[0].center;

      // Wrapped (2-line) cells are centred on the row: line 1 sits ~3pt above the
      // label, line 2 ~5pt below. Nearest label centre gives the right row.
      const rowOf = i => {
        let best = -1, bd = Infinity;
        rows.forEach((r, idx) => {
          const d = Math.abs(i.top - r.center);
          if (d < bd) { bd = d; best = idx; }
        });
        return bd <= rowH * 0.75 ? best : -1;
      };
      // Long text can start left of its cell edge, so classify by the text's centre.
      const colOf = i => {
        for (let c = 1; c <= 5; c++) if (i.xc >= EDGES[c] && i.xc < EDGES[c + 1]) return c - 1;
        return -1;
      };

      // 4. Bucket items into cells.
      const cells = new Map();
      for (const i of inTable) {
        if (i.xc < EDGES[1]) continue;      // time column
        if (DAYS.includes(i.str)) continue; // day header row
        const r = rowOf(i), c = colOf(i);
        if (r < 0 || c < 0) { warnings.push(`p${p} ${name}: stray text "${i.str}"`); continue; }
        const k = `${r}:${c}`;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push(i);
      }

      sections.push(name);
      for (const [k, its] of cells) {
        const [r, c] = k.split(':').map(Number);
        const raw = cleanText(its);
        const m = raw.match(ENTRY_RE);
        if (!m) { warnings.push(`p${p} ${name} ${DAYS[c]} ${rows[r].start}: unparsed "${raw}"`); continue; }
        entries.push({
          section: name,
          day: DAYS[c],
          start: rows[r].start,
          end: rows[r].end,
          subject: m[1].trim(),
          teachers: splitTeachers(m[2]),
          room: m[3],
        });
      }
    }
  }
  await loadingTask.destroy(); // free pdfjs page/font memory held for this upload
  return { sections, entries, warnings };
}

module.exports = { parseTimetable };