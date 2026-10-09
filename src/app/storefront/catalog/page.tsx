"use client";

import { Suspense } from 'react';
import { Store } from '@/components/icons';
import { StorefrontCatalogContent } from '@/components/storefront/StorefrontCatalogContent';

export default function StorefrontCatalogPage() {
    return (
        <Suspense fallback={
            <div className="min-h-dvh bg-neutral-900 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-3">
                    <Store className="size-8 animate-pulse text-blue-500" />
                    <p className="text-sm font-medium">Loading Storefront Catalog...</p>
                </div>
            </div>
        }>
            <StorefrontCatalogContent />
        </Suspense>
    );
}
