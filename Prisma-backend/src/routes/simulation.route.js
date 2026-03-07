import express from "express";
import {
    getSimulations,
    getSimulationById,
    adminPostSimulation,
    adminEditSimulation,
    adminDeleteSimulation,
    uploadSimulationFiles,
    getSimulationFileContents,
} from "../controllers/simulation.controller.js";

const router = express.Router();

// Public routes
router.get("/getSimulations", getSimulations);
router.get("/getSimulation/:id", getSimulationById);
router.get("/getSimulationFiles/:id", getSimulationFileContents);

// Admin routes
router.post("/adminPostSimulation", adminPostSimulation);
router.put("/editSimulation/:id", adminEditSimulation);
router.delete("/deleteSimulation/:id", adminDeleteSimulation);
router.post("/uploadFiles/:id", uploadSimulationFiles);

export default router;
