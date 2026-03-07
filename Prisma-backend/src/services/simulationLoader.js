import prisma from "../db/index.js";
import { downloadSimulationFiles } from "../utils/cloudinaryDownloader.js";

/**
 * Load a simulation and download all its files from Cloudinary.
 * Returns the simulation record and an array of { filename, content } objects.
 */
export async function loadSimulation(simulationId) {
    const simulation = await prisma.simulation.findUnique({
        where: { id: simulationId },
    });

    if (!simulation) {
        throw new Error("Simulation not found");
    }

    const files = await downloadSimulationFiles(simulation.initialFiles);

    return { simulation, files };
}
