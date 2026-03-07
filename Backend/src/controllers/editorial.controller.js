import { Editorial } from "../models/editorial.model.js";

export const createEditorial = async (req, res) => {
  try {
    const {
      questionId,
      title,
      intuition,
      approach,
      algorithm,
      code,
      timeComplexity,
      spaceComplexity,
    } = req.body;

    const existing = await Editorial.findOne({ question: questionId });
    if (existing) {
      return res.status(400).json({
        message: "Editorial already exists for this question",
      });
    }

    const editorial = await Editorial.create({
      question: questionId,
      title,
      intuition,
      approach,
      algorithm,
      code,
      timeComplexity,
      spaceComplexity,
    });

    res.status(201).json({
      success: true,
      editorial,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getEditorialByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const editorial = await Editorial.findOne({
      question: questionId,
    }).populate("question");

    if (!editorial) {
      return res.status(404).json({
        message: "Editorial not found",
      });
    }

    res.status(200).json({
      success: true,
      editorial,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};