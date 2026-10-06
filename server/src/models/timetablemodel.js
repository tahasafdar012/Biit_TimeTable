const fs = require("fs/promises");
const path = require("path");
const DATA_DIR = require("../dataDir");

const FILE = path.join(DATA_DIR, "timetable.json");

// The file only changes through save(), so keep the parsed copy in memory
// instead of re-reading and re-parsing it on every request.
let cache;

async function save(data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2));
  cache = data;
}

async function get() {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, "utf-8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    cache = null;
  }
  return cache;
}

module.exports = { save, get };
