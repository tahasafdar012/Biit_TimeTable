const app = require("./src/app");
const { loadSavedPassword } = require("./src/controllers/authcontroller");

const PORT = process.env.PORT || 5000;

loadSavedPassword(); // a password changed from the admin panel overrides ADMIN_PASSWORD

app.listen(PORT, ()=>{
    console.log(`BIIT TIME TABLE RUNING http://localhost:${PORT}`);
    if (!process.env.ADMIN_PASSWORD) {
        console.warn("WARNING: ADMIN_PASSWORD is not set (server/.env or Render environment) - uploads are disabled");
    }

})
