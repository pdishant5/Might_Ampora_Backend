import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middlewares.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Global rate-limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per "window"
    message: "Too many requests, please try again after some time!"
});

// Security middlewares
app.use(helmet());
app.use(hpp());
app.use("/api", limiter);

// Body-Parser middlewares
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.set('trust proxy', 1); // trust first proxy

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        status: "error",
        message: err.message || "Internal server error!",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

// CORS configuration
app.use(cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "device-remember-token",
        "Access-Control-Allow-Origin",
        "Origin",
        "Accept",
    ],
}));

// Import routes
import authRouter from "./routes/auth.routes.js";
import gadgetRouter from "./routes/gadget.routes.js";
import solarRouter from "./routes/solar.routes.js";
import activityRouter from "./routes/activity.routes.js";

// API routes
app.use("/api/v1/users", authRouter);
app.use("/api/v1/gadgets", gadgetRouter);
app.use("/api/v1/solar", solarRouter);
app.use("/api/v1/activity", activityRouter);

// 404 Not Found handler
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        message: "Page Not Found!"
    });
});

// Error handler
app.use(errorHandler);

export { app };