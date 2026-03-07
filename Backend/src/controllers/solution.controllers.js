import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Solution } from "../models/solution.model.js";
import { Question } from "../models/question.model.js";
import { User } from "../models/user.model.js";


const publishSolution = asyncHandler(async (req, res) => {

    const { questionId, code, language } = req.body;

    if (!questionId) {
        throw new ApiError(400, "Question ID is required!!");
    }

    if (!code || code.trim() === "") {
        throw new ApiError(400, "Code is required to publish solution!!");
    }

    if (!language) {
        throw new ApiError(400, "Language is required!!");
    }

    const findQuestion = await Question.findById(questionId);

    if (!findQuestion) {
        throw new ApiError(404, "Question not found!!");
    }

    const solution = await Solution.create({
        question: questionId,
        user: req.user._id,
        code,
        language
    });

    return res
    .status(201)
    .json({
        message: "Solution published successfully!!",
        data: solution
    });
});



const getSolutionsByQuestion = asyncHandler(async (req, res) => {

    const { questionId } = req.params;

    if (!questionId) {
        throw new ApiError(400, "Question ID is required!!");
    }

    const solutions = await Solution.find({ question: questionId })
        .populate("user", "username email")
        .sort({ createdAt: -1 });

    return res
    .status(200)
    .json({
        message: "Solutions fetched successfully!!",
        data: solutions
    });
});



const getMySolutions = asyncHandler(async (req, res) => {

    const solutions = await Solution.find({ user: req.user._id })
        .populate("question", "title")
        .sort({ createdAt: -1 });

    return res
    .status(200)
    .json({
        message: "Your solutions fetched successfully!!",
        data: solutions
    });
});




const upvoteSolution = asyncHandler(async (req, res) => {

    const { solutionId } = req.params;

    if (!solutionId) {
        throw new ApiError(400, "Solution ID is required!!");
    }

    const solution = await Solution.findByIdAndUpdate(
        solutionId,
        { $inc: { upvotes: 1 } },
        { new: true }
    );

    if (!solution) {
        throw new ApiError(404, "Solution not found!!");
    }

    return res
    .status(200)
    .json({
        message: "Solution upvoted successfully!!",
        data: solution
    });
});


export {
    publishSolution,
    getSolutionsByQuestion,
    getMySolutions,
    upvoteSolution
};