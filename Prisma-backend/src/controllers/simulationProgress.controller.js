import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

const getProgress = asyncHandler(async (req, res) => {
    const { simulationId } = req.params;
    const userId = req.user?.id;

    if (!userId) throw new ApiError(401, "Authentication required");
    if (!simulationId) throw new ApiError(400, "Simulation ID is required");

    const progress = await prisma.userSimulationProgress.findUnique({
        where: {
            userId_simulationId: { userId, simulationId },
        },
    });

    return res.status(200).json({
        message: "Progress fetched!",
        data: progress || { solved: false, attempts: 0, lastAttemptAt: null },
    });
});

const getAllProgress = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Authentication required");

    const progress = await prisma.userSimulationProgress.findMany({
        where: { userId },
        include: {
            simulation: {
                select: { title: true, difficulty: true, category: true, xpReward: true },
            },
        },
        orderBy: { lastAttemptAt: "desc" },
    });

    return res.status(200).json({
        message: "All progress fetched!",
        data: progress,
    });
});

const updateProgress = asyncHandler(async (req, res) => {
    const { simulationId } = req.params;
    const userId = req.user?.id;
    const { solved, modifiedFiles } = req.body;

    if (!userId) throw new ApiError(401, "Authentication required");
    if (!simulationId) throw new ApiError(400, "Simulation ID is required");

    const simulation = await prisma.simulation.findUnique({
        where: { id: simulationId },
    });
    if (!simulation) throw new ApiError(404, "Simulation not found");

    const updateData = {
        lastAttemptAt: new Date(),
    };
    if (typeof solved === "boolean") updateData.solved = solved;
    if (modifiedFiles) updateData.modifiedFiles = modifiedFiles;

    const progress = await prisma.userSimulationProgress.upsert({
        where: {
            userId_simulationId: { userId, simulationId },
        },
        create: {
            userId,
            simulationId,
            attempts: 1,
            lastAttemptAt: new Date(),
            solved: typeof solved === "boolean" ? solved : false,
            modifiedFiles: modifiedFiles || null,
        },
        update: {
            ...updateData,
            attempts: { increment: 1 },
        },
    });

    return res.status(200).json({
        message: "Progress updated!",
        data: progress,
    });
});

export { getProgress, getAllProgress, updateProgress };
