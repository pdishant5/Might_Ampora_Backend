import dotenv from "dotenv";

dotenv.config({
    path: "./.env"
});

import { app } from "./app.js";
import connectDB from "./database/db.js";

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        app.listen(PORT, () => console.log(`Server started on port: ${PORT}...`));
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });