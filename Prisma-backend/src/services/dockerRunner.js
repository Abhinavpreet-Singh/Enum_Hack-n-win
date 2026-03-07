import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

const DOCKER_TIMEOUT = 120_000; // 120 seconds
const DOCKER_IMAGE = "node:18";
const MAX_BUFFER = 5 * 1024 * 1024; // 5 MB

/**
 * Convert a Windows path to a Docker-compatible mount path.
 * Docker Desktop on Windows (WSL2/Hyper-V) expects /c/Users/... format.
 */
function toDockerPath(hostPath) {
    if (os.platform() !== "win32") return hostPath;
    return hostPath
        .replace(/^([A-Za-z]):\\/, (_, drive) => `/${drive.toLowerCase()}/`)
        .replace(/\\/g, "/");
}

/**
 * Write start.sh into the workspace directory.
 * Using a file on disk completely avoids shell-quoting/escaping issues
 * that occur when passing inline bash scripts through cmd.exe on Windows.
 *
 * @param {string} workspacePath  Absolute host path to the workspace
 * @param {string} entryPoint     Node.js entry file (e.g. "server.js")
 */
async function writeStartScript(workspacePath, entryPoint) {
    const script = [
        "#!/bin/bash",
        "set -e",
        "cd /app",
        "npm install --production 2>&1",
        `node ${entryPoint} &`,
        "SERVER_PID=$!",
        "sleep 5",
        "bash /app/tests.sh 2>&1",
        "TEST_EXIT=$?",
        "kill $SERVER_PID 2>/dev/null || true",
        "exit $TEST_EXIT",
    ].join("\n");

    await fs.writeFile(path.join(workspacePath, "start.sh"), script, "utf-8");
}

/**
 * Run a simulation workspace inside an isolated Docker container.
 *
 * Security constraints:
 *   --network bridge   (limited networking for curl tests)
 *   --memory 256m
 *   --cpus 0.5
 *   --pids-limit 100
 *
 * Uses execFile with an argument array to bypass cmd.exe on Windows —
 * no shell quoting or escaping issues.
 *
 * @param {string} workspacePath  Absolute host path to the workspace directory
 * @param {string} entryPoint     File to run with `node` (e.g. "server.js")
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
/**
 * Check whether the Docker daemon is reachable.
 * Throws a descriptive error if Docker is not running.
 */
export function checkDockerAvailable() {
    return new Promise((resolve, reject) => {
        execFile("docker", ["info"], { timeout: 10_000 }, (error, _stdout, stderr) => {
            if (error) {
                const msg = (stderr || error.message || "").toLowerCase();
                if (
                    msg.includes("cannot connect") ||
                    msg.includes("is the docker daemon running") ||
                    msg.includes("cannot find the file") ||
                    msg.includes("pipe") ||
                    msg.includes("connect enoent") ||
                    msg.includes("connection refused")
                ) {
                    reject(
                        new Error(
                            "Docker is not running. Please start Docker Desktop (switch to Linux Containers mode on Windows) and try again.",
                        ),
                    );
                } else {
                    reject(new Error(`Docker check failed: ${stderr || error.message}`));
                }
            } else {
                resolve(true);
            }
        });
    });
}

export async function runInDocker(workspacePath, entryPoint) {
    // Fail fast with a clear message if Docker daemon is not reachable
    await checkDockerAvailable();

    // Write start.sh to disk — avoids all inline bash quoting problems
    await writeStartScript(workspacePath, entryPoint);

    const dockerMount = toDockerPath(workspacePath);

    const args = [
        "run", "--rm",
        "--network", "bridge",
        "--memory", "256m",
        "--cpus", "0.5",
        "--pids-limit", "100",
        "-v", `${dockerMount}:/app`,
        DOCKER_IMAGE,
        "bash", "/app/start.sh",
    ];

    return new Promise((resolve) => {
        execFile(
            "docker",
            args,
            { timeout: DOCKER_TIMEOUT, maxBuffer: MAX_BUFFER },
            (error, stdout, stderr) => {
                resolve({
                    stdout: stdout || "",
                    stderr: stderr || "",
                    exitCode: error ? (error.code ?? 1) : 0,
                });
            },
        );
    });
}
