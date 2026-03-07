/**
 * Download a single file from its Cloudinary URL.
 *
 * @param {string} url  Cloudinary secure URL for a raw file
 * @returns {Promise<string>}  File content as text
 */
export async function downloadFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Cloudinary download failed: ${response.status} ${response.statusText}`,
        );
    }
    return response.text();
}

/**
 * Download all files for a simulation from Cloudinary.
 *
 * @param {Array<{name: string, path: string, content: string, cloudinaryUrl: string}>} files
 *   The `initialFiles` array from a Simulation record.
 * @returns {Promise<Array<{filename: string, content: string}>>}
 */
export async function downloadSimulationFiles(files) {
    if (!files || files.length === 0) return [];

    const results = [];

    await Promise.all(
        files.map(async (file) => {
            let content;
            if (file.cloudinaryUrl) {
                try {
                    content = await downloadFile(file.cloudinaryUrl);
                } catch (err) {
                    console.error(
                        `Failed to download ${file.path}: ${err.message}`,
                    );
                    content = file.content || "";
                }
            } else {
                content = file.content || "";
            }

            results.push({
                filename: file.path || file.name,
                content,
            });
        }),
    );

    return results;
}
