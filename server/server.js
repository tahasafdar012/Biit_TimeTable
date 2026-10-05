const app = require("./src/app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>{
    console.log(`BIIT TIME TABLE RUNING http://localhost:${PORT}`);
    if (!process.env.ADMIN_PASSWORD) {
        console.warn("WARNING: ADMIN_PASSWORD is not set in server/.env - uploads are disabled");
    }
    
})