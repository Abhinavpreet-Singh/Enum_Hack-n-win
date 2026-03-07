import mongoose from "mongoose";

const simulationFileSchema = new mongoose.Schema({
    name: { type: String, default: "" },
    path: { type: String, default: "" },
    content: { type: String, default: "" },
    language: { type: String, default: "javascript" },
    /** Cloudinary raw file URL — when present, content is fetched from here */
    cloudinaryUrl: { type: String, default: "" },
    /** Cloudinary public ID for deletion / management */
    cloudinaryPublicId: { type: String, default: "" },
}, { _id: false });

const simulationStepSchema = new mongoose.Schema({
    description: { type: String, default: "" },
}, { _id: false });

const simulationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        enum: ["frontend", "backend", "fullstack", "devops"],
        required: true,
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "easy",
    },
    description: {
        type: String,
        required: true,
    },
    incident: {
        type: String,
        required: true,
    },
    steps: {
        type: [simulationStepSchema],
        default: [],
    },
    initialFiles: {
        type: [simulationFileSchema],
        default: [],
    },
    solution: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    hints: {
        type: [String],
        default: [],
    },
    estimatedTime: {
        type: Number,
        default: 15,
    },
    tags: {
        type: [String],
        default: [],
    },
    xpReward: {
        type: Number,
        default: 50,
    },
    /** The file to execute when running the simulation (e.g. "server.js") */
    entryFile: {
        type: String,
        default: "index.js",
    },
    /** Optional expected stdout for auto-grading */
    expectedOutput: {
        type: String,
        default: "",
    },
}, { timestamps: true });

export const Simulation = mongoose.model("Simulation", simulationSchema);
