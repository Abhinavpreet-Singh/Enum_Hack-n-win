import mongoose from "mongoose";

const editorialSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
    },

    intuition: String,
    approach: String,
    algorithm: String,
    code: String,
    timeComplexity: String,
    spaceComplexity: String,
  },
  { timestamps: true }
);

export const Editorial = mongoose.model("Editorial", editorialSchema);