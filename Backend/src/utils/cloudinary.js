import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// ─── Cloudinary Configuration ────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a raw file buffer to Cloudinary under simulations/{simulationId}/
 *
 * @param {Buffer|string} content  – File content (Buffer or UTF-8 string)
 * @param {string} filename        – Filename (e.g. "server.js")
 * @param {string} simulationId    – Mongo ObjectId string for folder organisation
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadFileToCloudinary(content, filename, simulationId) {
    const buffer =
        typeof content === "string" ? Buffer.from(content, "utf-8") : content;

    const publicId = `simulations/${simulationId}/${filename.replace(/\//g, "_")}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                public_id: publicId,
                overwrite: true,
                invalidate: true,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        uploadStream.end(buffer);
    });
}

/**
 * Delete a raw file from Cloudinary by its public ID.
 *
 * @param {string} publicId – The Cloudinary public_id
 * @returns {Promise<object>}
 */
export async function deleteFileFromCloudinary(publicId) {
    return cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}

/**
 * Delete all files under a simulation's Cloudinary folder.
 *
 * @param {string} simulationId – Mongo ObjectId string
 * @returns {Promise<object>}
 */
export async function deleteSimulationFolder(simulationId) {
    const prefix = `simulations/${simulationId}`;
    try {
        // Delete all resources under the prefix
        await cloudinary.api.delete_resources_by_prefix(prefix, {
            resource_type: "raw",
        });
        // Remove the now-empty folder
        await cloudinary.api.delete_folder(prefix);
    } catch (err) {
        // Folder may not exist yet — that's fine
        if (err?.http_code !== 404) throw err;
    }
}

/**
 * Fetch raw file content from a Cloudinary URL.
 *
 * @param {string} url – Cloudinary secure_url
 * @returns {Promise<string>} – File content as UTF-8 string
 */
export async function fetchFileFromCloudinary(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`
        );
    }
    return response.text();
}

/**
 * Upload an image buffer to Cloudinary under avatars/
 *
 * @param {Buffer} buffer   – Image file buffer
 * @param {string} userId   – User's Mongo ObjectId string (used as public_id)
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadAvatarToCloudinary(buffer, userId) {
    const publicId = `avatars/${userId}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                public_id: publicId,
                overwrite: true,
                invalidate: true,
                transformation: [
                    { width: 400, height: 400, crop: "fill", gravity: "face" },
                ],
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        uploadStream.end(buffer);
    });
}

export { cloudinary };
