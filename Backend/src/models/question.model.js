import mongoose from "mongoose";

const questionSchema = mongoose.Schema({
    title: {
        type: String,
    },
    desc: {
        type: String,
    },
    level: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        default: "Easy"
    },
    // Test cases: each has input (array of string values, one per parameter line)
    // and expectedOutput (the expected stdout result)
    testcases: {
        type: [Object],
    },
    constraints: {
        type: String
    },
    topic: {
        type: String
    },
    functionName: {
        type: String,
        required: true
    },
    // Human-readable parameter names (e.g., ["nums", "target"])
    parameterNames: {
        type: [String],
        default: []
    },
    parameterTypes: {
        type: [String],   
        required: true
    },
    returnType: {
        type: String,     
        required: true
    },
    // initialCode is now auto-generated from function metadata.
    // This field is kept for any manual overrides.
    initialCode: {
        type: [Object],
        default: []
    }
})

export const Question = mongoose.model("Question", questionSchema);