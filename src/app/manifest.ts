import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Refloww - Financial Documentation Manager',
        short_name: 'Refloww',
        description: 'Create professional invoices, receipts, and delivery notes with custom templates',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#fc6d2d',
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    };
}
