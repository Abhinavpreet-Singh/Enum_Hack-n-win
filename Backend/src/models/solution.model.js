import mongoose from "mongoose";

const solutionSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    code: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: "javascript"
    },
    upvotes: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const Solution = mongoose.model("Solution", solutionSchema);