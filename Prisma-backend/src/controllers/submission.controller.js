import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

const saveSubmission = asyncHandler(async (req, res) => {
    const {
        questionId,
        code,
        language,
        verdict,
        passedCount,
        totalCount,
        runtime,
    } = req.body;

    if (!questionId) throw new ApiError(400, "Question ID is required");
    if (!code || code.trim() === "")
        throw new ApiError(400, "Code is required");
    if (!language) throw new ApiError(400, "Language is required");

    const question = await prisma.question.findUnique({
        where: { id: questionId },
    });
    if (!question) throw new ApiError(404, "Question not found");

    const normaliseVerdict = (v) => {
        if (v === "accepted") return "accepted";
        if (v === "wrong_answer") return "wrong_answer";
        if (v === "error" || v === "runtime_error") return "runtime_error";
        if (v === "partial") return "partial";
        return "wrong_answer";
    };

    const submission = await prisma.submission.create({
        data: {
            questionId,
            userId: req.user.id,
            code,
            language,
            verdict: normaliseVerdict(verdict),
            passedCount: passedCount ?? 0,
            totalCount: totalCount ?? 0,
            runtime: runtime ?? null,
        },
    });

    return res.status(201).json({
        message: "Submission saved successfully",
        data: submission,
    });
});

const getMySubmissions = asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    if (!questionId) throw new ApiError(400, "Question ID is required");

    const submissions = await prisma.submission.findMany({
        where: {
            userId: req.user.id,
            questionId,
        },
        orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
        message: "Submissions fetched successfully",
        data: submissions,
    });
});

const getRecentSubmissions = asyncHandler(async (req, res) => {
    const submissions = await prisma.submission.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
            question: { select: { title: true, level: true } },
        },
    });

    const seen = new Set();
    const recent = [];
    for (const s of submissions) {
        const qid = s.questionId;
        if (qid && !seen.has(qid)) {
            seen.add(qid);
            recent.push(s);
        }
        if (recent.length === 3) break;
    }

    return res.status(200).json({
        message: "Recent submissions fetched",
        data: recent,
    });
});

export { saveSubmission, getMySubmissions, getRecentSubmissions };
