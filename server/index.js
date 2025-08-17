import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./database/db.js";

dotenv.config({
    path: "../.env"
});

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        app.listen(PORT, () => console.log(`Server started on port: ${PORT}...`));
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });