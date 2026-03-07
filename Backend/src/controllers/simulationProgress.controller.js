import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { UserSimulationProgress } from "../models/userSimulationProgress.model.js";
import { Simulation } from "../models/simulation.model.js";

// ──────────────────────────────────────────────────────────────────────────────
// GET user progress for a specific simulation
// ──────────────────────────────────────────────────────────────────────────────
const getProgress = asyncHandler(async (req, res) => {
    const { simulationId } = req.params;
    const userId = req.user?._id;

    if (!userId) throw new ApiError(401, "Authentication required");
    if (!simulationId) throw new ApiError(400, "Simulation ID is required");

    const progress = await UserSimulationProgress.findOne({
        userId,
        simulationId,
    });

    return res.status(200).json({
        message: "Progress fetched!",
        data: progress || { solved: false, attempts: 0, lastAttemptAt: null },
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET all simulation progress for the authenticated user
// ──────────────────────────────────────────────────────────────────────────────
const getAllProgress = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Authentication required");

    const progress = await UserSimulationProgress.find({ userId })
        .populate("simulationId", "title difficulty category xpReward")
        .sort({ lastAttemptAt: -1 });

    return res.status(200).json({
        message: "All progress fetched!",
        data: progress,
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST / PUT update progress for a simulation (upsert)
// Body: { solved?: boolean, modifiedFiles?: Record<string, string> }
// ──────────────────────────────────────────────────────────────────────────────
const updateProgress = asyncHandler(async (req, res) => {
    const { simulationId } = req.params;
    const userId = req.user?._id;
    const { solved, modifiedFiles } = req.body;

    if (!userId) throw new ApiError(401, "Authentication required");
    if (!simulationId) throw new ApiError(400, "Simulation ID is required");

    // Verify simulation exists
    const simulation = await Simulation.findById(simulationId);
    if (!simulation) throw new ApiError(404, "Simulation not found");

    const update = {
        lastAttemptAt: new Date(),
        $inc: { attempts: 1 },
    };

    if (typeof solved === "boolean") update.solved = solved;
    if (modifiedFiles) update.modifiedFiles = modifiedFiles;

    const progress = await UserSimulationProgress.findOneAndUpdate(
        { userId, simulationId },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
        message: "Progress updated!",
        data: progress,
    });
});

export { getProgress, getAllProgress, updateProgress };
