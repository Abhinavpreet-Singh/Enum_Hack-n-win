import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Simulation } from "../models/simulation.model.js";
import {
    uploadFileToCloudinary,
    deleteFileFromCloudinary,
    deleteSimulationFolder,
    fetchFileFromCloudinary,
} from "../utils/cloudinary.js";

// GET all simulations (public)
const getSimulations = asyncHandler(async (req, res) => {
    const allSimulations = await Simulation.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
        message: "Simulations fetched!",
        data: allSimulations,
    });
});

// GET single simulation by ID (public)
const getSimulationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Simulation ID is required");
    }

    const simulation = await Simulation.findById(id);

    if (!simulation) {
        throw new ApiError(404, "Simulation not found");
    }

    return res.status(200).json({
        message: "Simulation fetched!",
        data: simulation,
    });
});

// POST create simulation (admin)
const adminPostSimulation = asyncHandler(async (req, res) => {
    const {
        title,
        category,
        difficulty,
        description,
        incident,
        steps,
        initialFiles,
        solution,
        hints,
        estimatedTime,
        tags,
        xpReward,
    } = req.body;

    if (!title?.trim() || !category?.trim() || !description?.trim() || !incident?.trim()) {
        throw new ApiError(400, "Title, category, description, and incident are required");
    }

    const existingSimulation = await Simulation.findOne({ title });

    if (existingSimulation) {
        throw new ApiError(409, "Simulation with this title already exists!");
    }

    const simulation = await Simulation.create({
        title,
        category,
        difficulty: difficulty || "easy",
        description,
        incident,
        steps: steps || [],
        initialFiles: initialFiles || [],
        solution: solution || {},
        hints: hints || [],
        estimatedTime: estimatedTime || 15,
        tags: tags || [],
        xpReward: xpReward || 50,
    }).catch((err) => {
        throw new ApiError(500, `Database error: ${err.message}`);
    });

    return res.status(201).json({
        message: "Simulation created!",
        data: simulation,
    });
});

// PUT update simulation (admin)
const adminEditSimulation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        title,
        category,
        difficulty,
        description,
        incident,
        steps,
        initialFiles,
        solution,
        hints,
        estimatedTime,
        tags,
        xpReward,
    } = req.body;

    if (!id) {
        throw new ApiError(400, "Simulation ID is required");
    }

    const simulation = await Simulation.findById(id);

    if (!simulation) {
        throw new ApiError(404, "Simulation not found");
    }

    if (title !== undefined) simulation.title = title;
    if (category !== undefined) simulation.category = category;
    if (difficulty !== undefined) simulation.difficulty = difficulty;
    if (description !== undefined) simulation.description = description;
    if (incident !== undefined) simulation.incident = incident;
    if (steps !== undefined) simulation.steps = steps;
    if (initialFiles !== undefined) simulation.initialFiles = initialFiles;
    if (solution !== undefined) simulation.solution = solution;
    if (hints !== undefined) simulation.hints = hints;
    if (estimatedTime !== undefined) simulation.estimatedTime = estimatedTime;
    if (tags !== undefined) simulation.tags = tags;
    if (xpReward !== undefined) simulation.xpReward = xpReward;

    const updatedSimulation = await simulation.save();

    return res.status(200).json({
        message: "Simulation updated successfully!",
        data: updatedSimulation,
    });
});

// DELETE simulation (admin) — also cleans up Cloudinary folder
const adminDeleteSimulation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Simulation ID is required");
    }

    const deletedSimulation = await Simulation.findByIdAndDelete(id);

    if (!deletedSimulation) {
        throw new ApiError(404, "Simulation not found");
    }

    // Best-effort Cloudinary cleanup
    try {
        await deleteSimulationFolder(id);
    } catch (err) {
        console.warn("Cloudinary cleanup failed:", err.message);
    }

    return res.status(200).json({
        message: "Simulation deleted successfully!",
        data: deletedSimulation,
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST upload files to Cloudinary for a simulation (admin)
// Body: { files: [{ path: string, content: string, language?: string }] }
// ──────────────────────────────────────────────────────────────────────────────
const uploadSimulationFiles = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { files } = req.body;

    if (!id) throw new ApiError(400, "Simulation ID is required");
    if (!files || !Array.isArray(files) || files.length === 0) {
        throw new ApiError(400, "files array is required");
    }

    const simulation = await Simulation.findById(id);
    if (!simulation) throw new ApiError(404, "Simulation not found");

    const uploadedFiles = [];

    for (const file of files) {
        if (!file.path || typeof file.content !== "string") {
            throw new ApiError(400, `Invalid file entry: ${JSON.stringify(file)}`);
        }

        const { url, publicId } = await uploadFileToCloudinary(
            file.content,
            file.path,
            id,
        );

        const fileName = file.path.split("/").pop() || file.path;

        uploadedFiles.push({
            name: fileName,
            path: file.path,
            content: "",                  // clear inline content — source of truth is Cloudinary
            language: file.language || "javascript",
            cloudinaryUrl: url,
            cloudinaryPublicId: publicId,
        });
    }

    // Replace the initialFiles array with Cloudinary-backed entries
    simulation.initialFiles = uploadedFiles;
    const updated = await simulation.save();

    return res.status(200).json({
        message: "Files uploaded to Cloudinary!",
        data: updated,
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET fetch file contents for a simulation (resolves Cloudinary URLs)
// Returns: { files: Record<path, content> }
// ──────────────────────────────────────────────────────────────────────────────
const getSimulationFileContents = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) throw new ApiError(400, "Simulation ID is required");

    const simulation = await Simulation.findById(id);
    if (!simulation) throw new ApiError(404, "Simulation not found");

    const fileMap = {};

    await Promise.all(
        simulation.initialFiles.map(async (file) => {
            if (file.cloudinaryUrl) {
                // Fetch from Cloudinary
                try {
                    const content = await fetchFileFromCloudinary(file.cloudinaryUrl);
                    fileMap[file.path] = content;
                } catch (err) {
                    console.error(`Error fetching ${file.path} from Cloudinary:`, err.message);
                    // Fallback to inline content
                    fileMap[file.path] = file.content || "";
                }
            } else {
                // Use inline content
                fileMap[file.path] = file.content || "";
            }
        }),
    );

    return res.status(200).json({
        message: "File contents fetched!",
        data: {
            simulationId: id,
            entryFile: simulation.entryFile || "index.js",
            files: fileMap,
        },
    });
});

export {
    getSimulations,
    getSimulationById,
    adminPostSimulation,
    adminEditSimulation,
    adminDeleteSimulation,
    uploadSimulationFiles,
    getSimulationFileContents,
};
