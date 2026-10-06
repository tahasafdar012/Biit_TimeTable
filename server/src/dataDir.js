const path = require("path");

// Where the uploaded timetable and the admin password change are saved.
// Locally: server/data. On Render: the persistent disk, e.g. DATA_DIR=/var/data
// (Render wipes every other folder on each restart and deploy).
module.exports = process.env.DATA_DIR || path.join(__dirname, "../data");
