import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Submission } from "../models/submission.model.js";
import { Question } from "../models/question.model.js";

/**
 * POST /api/v1/submissions/save
 * Saves a submission regardless of verdict (accepted, wrong_answer, error, etc.).
 */
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

    const question = await Question.findById(questionId);
    if (!question) throw new ApiError(404, "Question not found");

    // Normalise frontend verdict values to stored enum values
    const normaliseVerdict = (v) => {
        if (v === "accepted") return "accepted";
        if (v === "wrong_answer") return "wrong_answer";
        if (v === "error" || v === "runtime_error") return "runtime_error";
        if (v === "partial") return "partial";
        return "wrong_answer";
    };

    const submission = await Submission.create({
        question: questionId,
        user: req.user._id,
        code,
        language,
        verdict: normaliseVerdict(verdict),
        passedCount: passedCount ?? 0,
        totalCount: totalCount ?? 0,
        runtime: runtime ?? null,
    });

    return res.status(201).json({
        message: "Submission saved successfully",
        data: submission,
    });
});

/**
 * GET /api/v1/submissions/my/:questionId
 * Returns all submissions by the current user for a specific question,
 * sorted newest first.
 */
const getMySubmissions = asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    if (!questionId) throw new ApiError(400, "Question ID is required");

    const submissions = await Submission.find({
        user: req.user._id,
        question: questionId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
        message: "Submissions fetched successfully",
        data: submissions,
    });
});

/**
 * GET /api/v1/submissions/recent
 * Returns the most recent 3 distinct submissions for the current user
 * (one per question, latest verdict wins), populated with question info.
 */
const getRecentSubmissions = asyncHandler(async (req, res) => {
    // Fetch last 20 submissions for the user so we can deduplicate by question
    const submissions = await Submission.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("question", "title level");

    // Keep only the first (most recent) submission per question
    const seen = new Set();
    const recent = [];
    for (const s of submissions) {
        const qid = s.question?._id?.toString() ?? s.question?.toString();
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
