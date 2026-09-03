import { Suspense } from 'react';
import { Store } from 'lucide-react';
import { StorefrontCatalogContent } from '@/components/storefront/StorefrontCatalogContent';

export function generateStaticParams() {
    return [{ storeSlug: 'demo' }];
}

export default async function DedicatedStorefrontPage({ params }: { params: Promise<{ storeSlug: string }> }) {
    const resolvedParams = await params;

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-3">
                    <Store className="w-8 h-8 animate-pulse text-blue-500" />
                    <p className="text-sm font-medium">Loading Storefront Catalog...</p>
                </div>
            </div>
        }>
            <StorefrontCatalogContent isEmbedded={false} storeSlug={resolvedParams.storeSlug} />
        </Suspense>
    );
}
