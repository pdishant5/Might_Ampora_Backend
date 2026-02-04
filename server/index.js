import dotenv from "dotenv";

dotenv.config({
    path: "./.env"
});

import admin from "firebase-admin";
import { app } from "./app.js";
import connectDB from "./database/db.js";

// Initialize Firebase Admin SDK
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
    console.log(' Firebase Admin initialized successfully');
} catch (error) {
    console.error(' Firebase Admin initialization error:', error.message);
}

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        app.listen(PORT, () => console.log(`Server started on port: ${PORT}...`));
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });