import { asyncHandler } from "../utils/asyncHandler.js";
import { Question } from "../models/question.model.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { generateAllTemplates } from "../utils/judgeEngine/templateGenerator.js";

const getQuestion = asyncHandler(async (req, res) => {
    const allData = await Question.find({});

    // Enrich each question with auto-generated initial code if not manually set
    const enrichedData = allData.map(q => {
        const questionObj = q.toObject();

        // Auto-generate initial code templates from function metadata
        if (questionObj.functionName && questionObj.parameterTypes && questionObj.returnType) {
            const autoTemplates = generateAllTemplates({
                functionName: questionObj.functionName,
                parameterNames: questionObj.parameterNames || [],
                parameterTypes: questionObj.parameterTypes,
                returnType: questionObj.returnType,
            });

            // If no manual initialCode, use auto-generated
            if (!questionObj.initialCode || questionObj.initialCode.length === 0) {
                questionObj.initialCode = [
                    { python: autoTemplates.python },
                    { java: autoTemplates.java },
                    { c: autoTemplates.c },
                    { cpp: autoTemplates.cpp },
                ];
            }
        }

        return questionObj;
    });

    return res
        .status(200)
        .json({
            message: "Questions fetched!!",
            data: enrichedData
        });
});

const yourCodeSubmissions = asyncHandler(async (req, res) => {
    const { code, username, email } = req.body;

    if (!code && !Array.isArray(code) && code.length != 0) {
        throw new ApiError(404, "Code is required to submit!!");
    }

    if (!username && !email) {
        throw new ApiError(404, "Username or email is required!!");
    }

    const findUser = await User.findOne({
        $or: [{ username }, { email }]
    });
});

export { getQuestion };