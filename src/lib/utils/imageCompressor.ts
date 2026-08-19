/**
 * Compresses an uploaded image file into WebP format with optional scaling.
 * Returns a Promise that resolves to a compressed Data URL (image/webp).
 */
export async function compressImageToWebP(
    file: File,
    maxWidth: number = 1200,
    maxHeight: number = 1200,
    quality: number = 0.82
): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Selected file is not an image'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down maintaining aspect ratio if image dimensions exceed maximums
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to create canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert canvas to WebP data URL
                let webpDataUrl = canvas.toDataURL('image/webp', quality);
                
                // Fallback to jpeg if browser doesn't produce webp data URL
                if (!webpDataUrl.startsWith('data:image/webp')) {
                    webpDataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(webpDataUrl);
            };

            img.onerror = () => {
                reject(new Error('Failed to load image for compression'));
            };

            img.src = event.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read image file'));
        };

        reader.readAsDataURL(file);
    });
}
