import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
    {
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            required: true,
            default: "python",
        },
        verdict: {
            type: String,
            enum: [
                "accepted",
                "wrong_answer",
                "runtime_error",
                "compile_error",
                "error",
                "partial",
            ],
            default: "wrong_answer",
        },
        passedCount: {
            type: Number,
            default: 0,
        },
        totalCount: {
            type: Number,
            default: 0,
        },
        runtime: {
            type: Number, // in ms
            default: null,
        },
    },
    { timestamps: true }
);

export const Submission = mongoose.model("Submission", submissionSchema);
