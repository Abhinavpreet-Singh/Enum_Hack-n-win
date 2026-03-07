import express from "express";
import {
    runSimulation,
    getSubmission,
    getMySimulationSubmissions,
} from "../controllers/simulationEngine.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All simulation engine routes require authentication
router.use(verifyJWT);

// Run a simulation (submit edited files, execute in Docker, return score)
router.post("/run", runSimulation);

// Get a specific submission result
router.get("/submission/:id", getSubmission);

// Get all submissions for a simulation by the current user
router.get("/submissions/simulation/:simulationId", getMySimulationSubmissions);

export default router;
