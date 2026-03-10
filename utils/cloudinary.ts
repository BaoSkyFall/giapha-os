import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Parse CLOUDINARY_URL automatically (cloudinary SDK does this)
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
cloudinary.config({
    secure: true,
});

/**
 * Upload an image buffer to Cloudinary.
 * @param buffer - File buffer
 * @param folder - Cloudinary folder, e.g. "blog/covers" or "blog/content"
 * @returns Upload result with secure_url and public_id
 */
export async function uploadImage(
    buffer: Buffer,
    folder: string
): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    folder,
                    resource_type: "image",
                    transformation: [
                        { quality: "auto", fetch_format: "auto" },
                    ],
                },
                (error, result) => {
                    if (error || !result) {
                        reject(error || new Error("Upload failed"));
                    } else {
                        resolve(result);
                    }
                }
            )
            .end(buffer);
    });
}

/**
 * Delete an image from Cloudinary by public_id.
 */
export async function deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
}

/**
 * Get Cloudinary cloud name for client-side usage.
 */
export function getCloudName(): string {
    return cloudinary.config().cloud_name || "";
}
