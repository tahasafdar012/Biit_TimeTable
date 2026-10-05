const { parseTimetable } = require("./timetableParser");

async function extractTimetable(buffer) {
  return parseTimetable(buffer); // { sections, entries, warnings }
}

module.exports = { extractTimetable };
