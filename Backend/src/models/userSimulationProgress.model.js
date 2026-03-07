import mongoose from "mongoose";

const userSimulationProgressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        simulationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Simulation",
            required: true,
            index: true,
        },
        solved: {
            type: Boolean,
            default: false,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        lastAttemptAt: {
            type: Date,
            default: null,
        },
        /** Snapshot of user's modified files so they can resume later */
        modifiedFiles: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true },
);

// Compound index ensures one progress record per user per simulation
userSimulationProgressSchema.index(
    { userId: 1, simulationId: 1 },
    { unique: true },
);

export const UserSimulationProgress = mongoose.model(
    "UserSimulationProgress",
    userSimulationProgressSchema,
);
