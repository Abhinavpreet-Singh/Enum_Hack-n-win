import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { generateAllTemplates } from "../utils/judgeEngine/templateGenerator.js";

const getQuestion = asyncHandler(async (req, res) => {
    const allData = await prisma.question.findMany();

    const enrichedData = allData.map(q => {
        const questionObj = { ...q };

        if (questionObj.functionName && questionObj.parameterTypes && questionObj.returnType) {
            const autoTemplates = generateAllTemplates({
                functionName: questionObj.functionName,
                parameterNames: questionObj.parameterNames || [],
                parameterTypes: questionObj.parameterTypes,
                returnType: questionObj.returnType,
            });

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

export { getQuestion };
