
/**
 * Compresses an image file to a base64 string with a maximum size target.
 * 
 * @param file The image file to compress
 * @param maxWidth The maximum width of the image (default 1920)
 * @param quality The quality of the JPEG compression (0 to 1, default 0.7)
 * @returns A promise that resolves to the base64 string
 */
export const compressImage = (file: File, maxWidth = 1920, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize if too large
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG to reduce size significantly compared to PNG
                // Base64 strings are larger than binary, so we need aggressive compression
                // to stay under 1MB Firestore limit (1,048,576 bytes).
                // A safe target for the base64 string length is around 700KB to 800KB to allow for other data.

                // Iteratively reduce quality if needed (simple version: just use low quality)
                let dataUrl = canvas.toDataURL('image/jpeg', quality);

                // Check size. Base64 length is approx 4/3 of binary size.
                // 1MB binary ~= 1.33MB Base64. Firestore limit is 1MB TOTAL for the doc.
                // So the Base64 string must be < 1MB characters (approx).
                // Actually 1 MiB = 1,048,576 bytes. 
                // In UTF-8, 1 char = 1 byte (mostly). Base64 is ASCII, so 1 char = 1 byte.
                // So max string length is ~1,000,000.

                while (dataUrl.length > 900000 && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Compresses an existing base64 data URL to a smaller size for Firestore storage.
 * Used during migration to compress legacy images.
 * 
 * @param dataUrl The existing base64 data URL
 * @param maxWidth The maximum width of the image (default 1920)
 * @param targetSize Target size in bytes for the output (default 750000 for ~750KB)
 * @returns A promise that resolves to the compressed base64 string
 */
export const compressImageFromDataUrl = (
    dataUrl: string,
    maxWidth = 1920,
    targetSize = 750000
): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Skip if not a data URL or if it's already small enough
        if (!dataUrl || !dataUrl.startsWith('data:image')) {
            resolve(dataUrl);
            return;
        }

        // If already small, no need to compress
        if (dataUrl.length <= targetSize) {
            resolve(dataUrl);
            return;
        }

        const img = new Image();
        img.src = dataUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize if too large
            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Start with high quality and reduce until under target size
            let quality = 0.8;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            // Iteratively reduce quality to meet target size
            while (compressedDataUrl.length > targetSize && quality > 0.1) {
                quality -= 0.1;
                compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            // If still too large, also reduce dimensions
            if (compressedDataUrl.length > targetSize && width > 800) {
                const scale = 800 / width;
                canvas.width = 800;
                canvas.height = Math.round(height * scale);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            }

            resolve(compressedDataUrl);
        };

        img.onerror = (err) => {
            // If image fails to load, return original
            console.warn('Failed to compress image, returning original:', err);
            resolve(dataUrl);
        };
    });
};
