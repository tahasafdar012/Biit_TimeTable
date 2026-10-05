const pdfService = require("../services/pdfService");
const Timetable = require("../models/timetablemodel");

// Resolve "today" to the actual weekday name, in the university's timezone —
// not the server's, since Node/hosting can run in UTC or anywhere else.
function currentDayName() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Karachi" }).format(new Date());
}

// day=today (case-insensitive) -> the real weekday name; everything else passes through unchanged
function resolveDay(day) {
  if (!day) return day;
  return day.toLowerCase() === "today" ? currentDayName() : day;
}

exports.uploadTimetable = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const { sections, entries, warnings } = await pdfService.extractTimetable(req.file.buffer);

    if (entries.length === 0) {
      return res.status(422).json({ error: "No classes found in this PDF", warnings });
    }

    const data = { updatedAt: new Date().toISOString(), sections, entries, warnings };
    await Timetable.save(data);
    res.json({ updatedAt: data.updatedAt, sections: sections.length, entries: entries.length, warnings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to parse timetable PDF" });
  }
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// "1:30" -> minutes since midnight; hours before 8 are afternoon (1:30 = 13:30)
const toMinutes = t => {
  const [h, m] = t.split(":").map(Number);
  return (h < 8 ? h + 12 : h) * 60 + m;
};

// Empty slots from 5:00 pm onwards are "No Class" (day is over), not a free period
const DAY_END = toMinutes("5:00");

// Time slots and a "section|day|start-end" lookup, built once per uploaded timetable
const indexCache = new WeakMap();
function getIndex(data) {
  let index = indexCache.get(data);
  if (!index) {
    const slots = new Map();
    const byCell = new Map();
    for (const e of data.entries) {
      const slot = `${e.start}-${e.end}`;
      if (!slots.has(slot)) slots.set(slot, { start: e.start, end: e.end });
      const key = `${e.section}|${e.day}|${slot}`;
      if (!byCell.has(key)) byCell.set(key, e);
    }
    const sorted = [...slots.values()].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    index = { slots: sorted, byCell };
    indexCache.set(data, index);
  }
  return index;
}

// One section's week, day by day: its classes, plus "No Class" for empty slots after 5 pm
function buildWeek(data, section, day) {
  const { slots, byCell } = getIndex(data);

  const days = {};
  for (const d of DAYS) {
    if (day && d !== day) continue;
    days[d] = slots.flatMap(({ start, end }) => {
      const e = byCell.get(`${section}|${d}|${start}-${end}`);
      if (e) return [{ start, end, status: "class", subject: e.subject, teachers: e.teachers, room: e.room }];
      return toMinutes(start) >= DAY_END
        ? [{ start, end, status: "off", subject: "No Class", teachers: [], room: null }]
        : [];
    });
  }
  return { updatedAt: data.updatedAt, section, days };
}

exports.getTimetable = async (req, res) => {
  try {
    const data = await Timetable.get();
    if (!data) return res.status(404).json({ error: "No timetable uploaded yet" });

    const { section } = req.query;
    const day = resolveDay(req.query.day);          // <-- changed
    const { view } = req.query;

    if (view === "week") {
      if (!section) return res.status(400).json({ error: "view=week needs a section" });
      if (!data.sections.includes(section)) return res.status(404).json({ error: `Unknown section: ${section}` });
      return res.json(buildWeek(data, section, day));  // unchanged, just now gets a resolved day
    }
    if (section || day) {
      const entries = data.entries.filter(
        e => (!section || e.section === section) && (!day || e.day === day)
      );
      return res.json({ updatedAt: data.updatedAt, entries });
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read timetable" });
  }
};
exports.getSections = async (req, res) => {
  const data = await Timetable.get();
  if (!data) return res.status(404).json({ error: "No timetable uploaded yet" });
  res.json({ sections: data.sections });
};