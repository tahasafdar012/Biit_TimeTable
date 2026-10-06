const store = require("../store");

// Only save() changes the timetable, so keep the parsed copy in memory
// instead of reading it from the file / database on every request.
let cache;

async function save(data) {
  await store.write("timetable", data);
  cache = data;
}

async function get() {
  if (cache === undefined) cache = await store.read("timetable");
  return cache;
}

module.exports = { save, get };
