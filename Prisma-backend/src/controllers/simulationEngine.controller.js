import os from "os";
import path from "path";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import { loadSimulation } from "../services/simulationLoader.js";
import { runInDocker } from "../services/dockerRunner.js";
import { generateTestScript } from "../services/testRunner.js";
import { parseResult } from "../services/resultParser.js";
import { buildWorkspace, cleanWorkspace } from "../utils/fileBuilder.js";

/**
 * POST /run
 *
 * Execute a simulation submission:
 *  1. Download base files from Cloudinary
 *  2. Merge with student's edited files
 *  3. Generate curl-based test script
 *  4. Build workspace on disk
 *  5. Run inside isolated Docker container
 *  6. Parse results and return score + logs
 */
const runSimulation = asyncHandler(async (req, res) => {
    const { simulationId, editedFiles } = req.body;

    if (!simulationId) {
        throw new ApiError(400, "simulationId is required");
    }
    if (!editedFiles || !Array.isArray(editedFiles) || editedFiles.length === 0) {
        throw new ApiError(400, "editedFiles array is required");
    }

    // Validate each file entry
    for (const f of editedFiles) {
        if (!f.filename || typeof f.content !== "string") {
            throw new ApiError(400, "Each file must have a filename and content string");
        }
    }

    const simulation = await prisma.simulation.findUnique({
        where: { id: simulationId },
    });
    if (!simulation) {
        throw new ApiError(404, "Simulation not found");
    }

    // Create submission record (status: running)
    const submission = await prisma.simulationSubmission.create({
        data: {
            userId: req.user.id,
            simulationId,
            editedFiles: editedFiles.map((f) => ({
                filename: f.filename,
                content: f.content,
            })),
            status: "running",
        },
    });

    const workspacePath = path.join(
        os.tmpdir(),
        "enum-workspace",
        submission.id,
    );

    try {
        // ── 1. Download base project files from Cloudinary ───────────────
        const { files: baseFiles } = await loadSimulation(simulationId);

        // ── 2. Merge: student edits override base files ──────────────────
        const fileMap = new Map();
        for (const f of baseFiles) {
            fileMap.set(f.filename, f.content);
        }
        for (const f of editedFiles) {
            fileMap.set(f.filename, f.content);
        }

        const mergedFiles = Array.from(fileMap.entries()).map(
            ([filename, content]) => ({ filename, content }),
        );

        // ── 3. Generate tests.sh from testCommands ───────────────────────
        const testPort = simulation.testPort || 3000;
        const testScript = generateTestScript(
            simulation.testCommands || [],
            testPort,
        );
        mergedFiles.push({ filename: "tests.sh", content: testScript });

        // ── 4. Build workspace on disk ───────────────────────────────────
        await buildWorkspace(workspacePath, mergedFiles);

        // ── 5. Execute inside Docker ─────────────────────────────────────
        const entryPoint = simulation.entryFile || "server.js";
        const dockerResult = await runInDocker(workspacePath, entryPoint);

        // ── 6. Detect Docker-level failures (daemon errors, container crash) ──
        const combinedLogs =
            `${dockerResult.stdout}\n${dockerResult.stderr}`.trim();

        // If Docker itself errored (not a test failure), surface it clearly
        const dockerError = dockerResult.exitCode !== 0 &&
            dockerResult.stdout.trim() === "" &&
            dockerResult.stderr.length > 0 &&
            !combinedLogs.includes("RESULT");

        if (dockerError) {
            throw new Error(`Docker execution error:\n${dockerResult.stderr.trim()}`);
        }

        // ── 7. Parse results ─────────────────────────────────────────────
        const result = parseResult(combinedLogs);

        // ── 7. Persist results ───────────────────────────────────────────
        await prisma.simulationSubmission.update({
            where: { id: submission.id },
            data: {
                score: result.score,
                logs: result.logs,
                passedTests: result.passedTests,
                totalTests: result.totalTests,
                status: "completed",
            },
        });

        // ── 8. Update simulation progress ────────────────────────────────
        const solved =
            result.totalTests > 0 &&
            result.passedTests === result.totalTests;

        await prisma.userSimulationProgress.upsert({
            where: {
                userId_simulationId: {
                    userId: req.user.id,
                    simulationId,
                },
            },
            create: {
                userId: req.user.id,
                simulationId,
                attempts: 1,
                solved,
                lastAttemptAt: new Date(),
                modifiedFiles: editedFiles,
            },
            update: {
                attempts: { increment: 1 },
                solved,
                lastAttemptAt: new Date(),
                modifiedFiles: editedFiles,
            },
        });

        return res.status(200).json({
            message: "Simulation run completed",
            data: {
                submissionId: submission.id,
                score: result.score,
                passedTests: result.passedTests,
                totalTests: result.totalTests,
                logs: result.logs,
            },
        });
    } catch (error) {
        // Mark submission as failed
        await prisma.simulationSubmission
            .update({
                where: { id: submission.id },
                data: {
                    status: "failed",
                    logs: error.message || "Unknown error",
                },
            })
            .catch(() => {}); // don't mask original error

        throw new ApiError(
            500,
            `Simulation execution failed: ${error.message}`,
        );
    } finally {
        await cleanWorkspace(workspacePath);
    }
});

/**
 * GET /submission/:id
 *
 * Retrieve a single simulation submission result.
 */
const getSubmission = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Submission ID is required");
    }

    const submission = await prisma.simulationSubmission.findUnique({
        where: { id },
    });

    if (!submission) {
        throw new ApiError(404, "Submission not found");
    }

    // Only the owner can view their submission
    if (submission.userId !== req.user.id) {
        throw new ApiError(403, "Not authorized to view this submission");
    }

    return res.status(200).json({
        message: "Submission fetched",
        data: {
            submissionId: submission.id,
            simulationId: submission.simulationId,
            score: submission.score,
            passedTests: submission.passedTests,
            totalTests: submission.totalTests,
            logs: submission.logs,
            status: submission.status,
            createdAt: submission.createdAt,
        },
    });
});

/**
 * GET /submissions/simulation/:simulationId
 *
 * Get all submissions for a specific simulation by the current user.
 */
const getMySimulationSubmissions = asyncHandler(async (req, res) => {
    const { simulationId } = req.params;

    if (!simulationId) {
        throw new ApiError(400, "Simulation ID is required");
    }

    const submissions = await prisma.simulationSubmission.findMany({
        where: {
            userId: req.user.id,
            simulationId,
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            score: true,
            passedTests: true,
            totalTests: true,
            status: true,
            createdAt: true,
        },
    });

    return res.status(200).json({
        message: "Submissions fetched",
        data: submissions,
    });
});

export { runSimulation, getSubmission, getMySimulationSubmissions };
