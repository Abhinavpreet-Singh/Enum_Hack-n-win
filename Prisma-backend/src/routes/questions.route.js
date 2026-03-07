import Router from "express"
import { getQuestion } from "../controllers/questions.controller.js";

const router = Router();

router.route("/getQuestion").get(getQuestion)

export default router;
