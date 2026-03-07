import fs from "fs/promises";
import path from "path";

/**
 * Build a project workspace by writing files into a directory,
 * reconstructing nested folder structures from file paths.
 *
 * @param {string} workspacePath  Absolute path to the workspace root
 * @param {Array<{filename: string, content: string}>} files  Files to write
 */
export async function buildWorkspace(workspacePath, files) {
    const resolvedRoot = path.resolve(workspacePath);
    await fs.mkdir(resolvedRoot, { recursive: true });

    for (const file of files) {
        // Sanitize: strip leading slashes and parent traversals
        const safeName = file.filename
            .replace(/\.\.[/\\]/g, "")
            .replace(/^[/\\]+/, "");

        const filePath = path.join(resolvedRoot, safeName);
        const resolvedFile = path.resolve(filePath);

        // Guard against path traversal
        if (!resolvedFile.startsWith(resolvedRoot)) {
            throw new Error(`Path traversal detected: ${file.filename}`);
        }

        await fs.mkdir(path.dirname(resolvedFile), { recursive: true });
        await fs.writeFile(resolvedFile, file.content, "utf-8");
    }
}

/**
 * Remove a workspace directory and all its contents.
 *
 * @param {string} workspacePath  Absolute path to the workspace root
 */
export async function cleanWorkspace(workspacePath) {
    try {
        await fs.rm(workspacePath, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors — temp dir may already be gone
    }
}
