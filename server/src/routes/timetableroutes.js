const express = require("express");
const upload = require("../middleware/upload");
const { requireAdmin } = require("../middleware/auth");
const controller = require("../controllers/timetablecontroller");
const auth = require("../controllers/authcontroller");

const router = express.Router();

// check the admin password (used by the admin panel's login screen)
router.post("/login", requireAdmin, auth.login);
// change it: send the current password in the header, { newPassword } in the body
router.post("/password", requireAdmin, auth.changePassword);

// password is checked before the PDF is read, so strangers can't upload
router.post(
  "/upload",
  requireAdmin,
  (req, res, next) =>
    upload.single("file")(req, res, err =>
      err ? res.status(400).json({ error: err.message }) : next()
    ),
  controller.uploadTimetable
);
router.get("/", controller.getTimetable);
router.get("/sections", controller.getSections);

module.exports = router;
