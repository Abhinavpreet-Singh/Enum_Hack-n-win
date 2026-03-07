import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

const allowedOrigins = [
    "http://localhost:3000",
    "https://enum.live",
    "https://www.enum.live",
    "https://enum0.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"));
        }
    },
    credentials: true,
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"]
}));

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(cookieParser())

app.get("/", (req, res) => {
	res.send("Hello from the server!")
})

import userRouter from "./routes/user.route.js"
import adminRouter from "./routes/admin.route.js"
import questionRouter from "./routes/questions.route.js"
import solutionRouter from "./routes/solution.route.js";
import judgeRoutes from "./routes/judge.route.js";
import editorialRoute from "./routes/editorial.route.js";
import simulationRouter from "./routes/simulation.route.js";
import simulationProgressRouter from "./routes/simulationProgress.route.js";
import submissionRouter from "./routes/submission.route.js";
import complexityRouter from "./routes/complexity.route.js";
import simulationEngineRouter from "./routes/simulationEngine.route.js";

app.use("/api/v1/users", userRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/questions", questionRouter)
app.use("/api/v1/solutions", solutionRouter);
app.use("/api/v1/judge", judgeRoutes);
app.use("/api/editorial", editorialRoute);
app.use("/api/v1/simulations", simulationRouter);
app.use("/api/v1/simulation-progress", simulationProgressRouter);
app.use("/api/v1/submissions", submissionRouter);
app.use("/api/v1/complexity", complexityRouter);
app.use("/api/v1/simulation-engine", simulationEngineRouter);

// Global JSON error handler — must be registered after all routes
app.use((err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || [],
    });
});

export { app }
