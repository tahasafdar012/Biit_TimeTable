const fs = require("fs/promises");
const path = require("path");
const DATA_DIR = require("./dataDir");

// Saved data (the timetable, a changed admin password) lives in one of two places:
//   - MongoDB, when MONGODB_URI is set: for Render's free plan, which deletes local
//     files every time the server sleeps or redeploys (free MongoDB Atlas works)
//   - JSON files in DATA_DIR otherwise: local development, or a server with a disk
// Each item is stored under a name: file DATA_DIR/<name>.json, or Mongo document _id <name>.

const MONGODB_URI = process.env.MONGODB_URI;
let collectionPromise;

function collection() {
  if (!collectionPromise) {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    collectionPromise = client
      .connect()
      .then(() => client.db(process.env.MONGODB_DB || "biit_timetable").collection("store"))
      .catch(err => {
        collectionPromise = null; // try again on the next request
        throw err;
      });
  }
  return collectionPromise;
}

const fileFor = name => path.join(DATA_DIR, `${name}.json`);

/** The saved value, or null if nothing was saved under this name yet. */
async function read(name) {
  if (MONGODB_URI) {
    const doc = await (await collection()).findOne({ _id: name });
    return doc ? doc.value : null;
  }
  try {
    return JSON.parse(await fs.readFile(fileFor(name), "utf-8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function write(name, value) {
  if (MONGODB_URI) {
    await (await collection()).replaceOne({ _id: name }, { _id: name, value }, { upsert: true });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(fileFor(name), JSON.stringify(value, null, 2));
}

const backend = MONGODB_URI ? "MongoDB" : `files in ${DATA_DIR}`;

module.exports = { read, write, backend };
