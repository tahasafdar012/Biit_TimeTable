const app = require("./src/app");
const { loadSavedPassword } = require("./src/controllers/authcontroller");
const store = require("./src/store");

const PORT = process.env.PORT || 5000;

// a password changed from the admin panel overrides ADMIN_PASSWORD
loadSavedPassword().finally(() => {
    app.listen(PORT, ()=>{
        console.log(`BIIT TIME TABLE RUNING http://localhost:${PORT}`);
        console.log(`Saving data to: ${store.backend}`);
        if (!process.env.ADMIN_PASSWORD) {
            console.warn("WARNING: ADMIN_PASSWORD is not set (server/.env or Render environment) - uploads are disabled");
        }
    })
});
