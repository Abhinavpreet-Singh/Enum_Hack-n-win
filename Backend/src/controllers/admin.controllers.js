import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Question } from "../models/question.model.js";

const getAdminPrivilege = asyncHandler(async (req, res) => {

    const adminEmails = [
        "prathamv0106@gmail.com"
    ]

    return res
        .status(200)
        .json({
            message: "Admin emails fetched!!",
            data: {"email": adminEmails}
        })
})


const adminPostQuestion = asyncHandler(async (req, res) => {
    const { title, desc, level, testcases, constraints, topic, initialCode, functionName, parameterNames, parameterTypes, returnType } = req.body;

    if (
        !title?.trim() ||
        !desc?.trim() ||
        !level?.trim() ||
        !constraints?.trim() ||
        !Array.isArray(testcases) ||
        testcases.length === 0 ||
        !topic ||
        !functionName?.trim() ||
        !Array.isArray(parameterTypes) ||
        parameterTypes.length === 0 ||
        !returnType?.trim()
    ) {
        throw new ApiError(400, "All fields are required (including functionName, parameterTypes, returnType)");
    }


    const questionExists = await Question.findOne({ title, desc })

    if (questionExists) {
        throw new ApiError(409, "Question already exists!!")
    }


    const createQuestion = await Question.create({
        title,
        desc,
        level,
        testcases,
        constraints,
        topic,
        functionName,
        parameterNames: parameterNames || [],
        parameterTypes,
        returnType,
        initialCode
    })

    return res
        .status(201)
        .json({
            message: "Question created",
            data: createQuestion
        })
})

const adminEditQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, desc, level, testcases, constraints, topic, initialCode, functionName, parameterNames, parameterTypes, returnType } = req.body;

    if (!id) {
        throw new ApiError(400, "Question ID is required");
    }

    const question = await Question.findById(id);

    if (!question) {
        throw new ApiError(404, "Question not found");
    }

    if (title !== undefined) question.title = title;
    if (desc !== undefined) question.desc = desc;
    if (level !== undefined) question.level = level;
    if (testcases !== undefined) question.testcases = testcases;
    if (constraints !== undefined) question.constraints = constraints;
    if (topic !== undefined) question.topic = topic;
    if (initialCode !== undefined) question.initialCode = initialCode;
    if (functionName !== undefined) question.functionName = functionName;
    if (parameterNames !== undefined) question.parameterNames = parameterNames;
    if (parameterTypes !== undefined) question.parameterTypes = parameterTypes;
    if (returnType !== undefined) question.returnType = returnType;

    const updatedQuestion = await question.save();

    return res.status(200).json({
        message: "Question updated successfully",
        data: updatedQuestion
    });
});


const adminDeleteQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Question ID is required");
    }

    const deletedQuestion = await Question.findByIdAndDelete(id);

    if (!deletedQuestion) {
        throw new ApiError(404, "Question not found");
    }

    return res.status(200).json({
        message: "Question deleted successfully",
        data: deletedQuestion
    });
});


export {
    adminPostQuestion,
    getAdminPrivilege,
    adminEditQuestion,
    adminDeleteQuestion
}