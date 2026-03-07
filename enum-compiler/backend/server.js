import express from "express";
import cors from "cors";
import fs from "fs";
import { exec } from "child_process";
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/run", (req, res) => {
  const { language, code } = req.body;

  let filename;

  if (language === "python") filename = "code.py";
  else if (language === "cpp") filename = "code.cpp";
  else if (language === "c") filename = "code.c";
  else if (language === "java") filename = "Main.java";
  else if (language === "node") filename = "code.js";
  else return res.json({ output: "Invalid language" });

  fs.writeFileSync(filename, code);

  const command = `
  docker run --rm \
  --network none \
  --memory="256m" \
  --cpus="0.5" \
  -v ${process.cwd()}:/app \
  enum-runner ${language} ${filename}
  `;

  exec(command, (error, stdout, stderr) => {
    fs.unlinkSync(filename);
    res.json({ output: stdout || stderr });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

