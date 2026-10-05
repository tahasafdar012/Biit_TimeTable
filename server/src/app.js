const express =  require("express");
const cors = require("cors");
const timetableRoutes = require("./routes/timetableroutes");
const errorHandler = require("./middleware/errorHandler")


const app = express();

app.use(cors());
app.use(express.json());

app.get("/",(req,res)=>{
    res.json({
        status:200,
        message:"BIIT Timetable API is running",
    });
})

app.use("/api/timetable", timetableRoutes);
app.use(errorHandler);

module.exports= app;
