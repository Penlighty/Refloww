/**
 * Uploads an image file to Cloudinary using an unsigned upload preset.
 * Returns the secure Cloudinary image URL, or null if Cloudinary is not configured.
 */
export async function uploadToCloudinary(fileOrBase64: File | string): Promise<string | null> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        // Cloudinary credentials not configured in env
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('file', fileOrBase64);
        formData.append('upload_preset', uploadPreset);
        formData.append('format', 'webp');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn('Cloudinary upload response error:', errData);
            return null;
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.warn('Cloudinary upload failed, falling back to local WebP compression:', error);
        return null;
    }
}
