"use client";

import { useProductStore, useSettingsStore } from '@/lib/store';
import { Product, ProductAlternative } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button, Modal, ModalFooter } from '@/components/ui';
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, Package } from 'lucide-react';

interface ProductAlternativeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onSelectAlternative: (alternativeProduct: Product) => void;
}

export default function ProductAlternativeSelector({
    isOpen,
    onClose,
    product,
    onSelectAlternative
}: ProductAlternativeSelectorProps) {
    const { products, getProductAlternatives } = useProductStore();
    const { company } = useSettingsStore();

    // Get linked alternatives
    const linkedAlternatives = getProductAlternatives(product.id);

    // Map linked alternatives to actual products
    const altProductList = linkedAlternatives
        .map(alt => {
            const targetId = alt.productId === product.id ? alt.alternativeProductId : alt.productId;
            const targetProd = products.find(p => p.id === targetId);
            return targetProd ? { alternative: alt, product: targetProd } : null;
        })
        .filter((item): item is { alternative: ProductAlternative; product: Product } => item !== null);

    // Also auto-suggest products in the same category if no explicit alternatives linked
    const sameCategorySuggestions = products.filter(p =>
        p.id !== product.id &&
        p.category &&
        p.category === product.category &&
        (p.stockQuantity === undefined || p.stockQuantity > 0) &&
        !altProductList.some(a => a.product.id === p.id)
    );

    const exactEquivalents = altProductList.filter(a => a.alternative.matchType === 'exact_equivalent');
    const similarSubstitutes = altProductList.filter(a => a.alternative.matchType === 'similar_substitute');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Stock Unavailable — Suggested Alternatives for ${product.name}`}
            size="lg"
        >
            <div className="space-y-6">
                {/* Out of stock warning banner */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                            {product.name} is currently out of stock ({product.stockQuantity ?? 0} remaining)
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Don't lose this sale! Choose an in-stock equivalent brand or similar product below to swap into your document line-items.
                        </p>
                    </div>
                </div>

                {/* Section 1: Exact Equivalents */}
                {exactEquivalents.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                                Exact Equivalents (Same Specification & Function)
                            </h4>
                        </div>
                        <div className="space-y-2">
                            {exactEquivalents.map(({ alternative, product: altProd }) => (
                                <div
                                    key={altProd.id}
                                    className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-400 transition-all flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                            {altProd.imageUrl ? (
                                                <img src={altProd.imageUrl} alt={altProd.name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <Package className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-neutral-900 dark:text-white">{altProd.name}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                                    Exact Match
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                SKU: <code className="font-mono">{altProd.sku}</code> • Price: <strong>{formatCurrency(altProd.unitPrice, company.currency)}</strong> • In Stock: <strong className="text-emerald-600 dark:text-emerald-400">{altProd.stockQuantity ?? 'Available'} units</strong>
                                            </p>
                                            {alternative.notes && (
                                                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 italic mt-1">"{alternative.notes}"</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            onSelectAlternative(altProd);
                                            onClose();
                                        }}
                                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                                    >
                                        Swap to this
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 2: Similar Substitutes */}
                {similarSubstitutes.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                                Similar Substitutes (Related Brand / Function)
                            </h4>
                        </div>
                        <div className="space-y-2">
                            {similarSubstitutes.map(({ alternative, product: altProd }) => (
                                <div
                                    key={altProd.id}
                                    className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20 hover:border-blue-400 transition-all flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                            {altProd.imageUrl ? (
                                                <img src={altProd.imageUrl} alt={altProd.name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <Package className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-neutral-900 dark:text-white">{altProd.name}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                                    Similar
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                SKU: <code className="font-mono">{altProd.sku}</code> • Price: <strong>{formatCurrency(altProd.unitPrice, company.currency)}</strong> • In Stock: <strong className="text-emerald-600 dark:text-emerald-400">{altProd.stockQuantity ?? 'Available'} units</strong>
                                            </p>
                                            {alternative.notes && (
                                                <p className="text-[11px] text-blue-800 dark:text-blue-300 italic mt-1">"{alternative.notes}"</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            onSelectAlternative(altProd);
                                            onClose();
                                        }}
                                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                                    >
                                        Select Substitute
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 3: Category Fallback Suggestions */}
                {altProductList.length === 0 && sameCategorySuggestions.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                            Other Available Products in Category "{product.category}"
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {sameCategorySuggestions.map(altProd => (
                                <div
                                    key={altProd.id}
                                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-violet-500 transition-all flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <span className="font-medium text-sm text-neutral-900 dark:text-white block">{altProd.name}</span>
                                        <span className="text-xs text-neutral-500">{formatCurrency(altProd.unitPrice, company.currency)} • {altProd.stockQuantity ?? 0} in stock</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            onSelectAlternative(altProd);
                                            onClose();
                                        }}
                                    >
                                        Use Instead
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {altProductList.length === 0 && sameCategorySuggestions.length === 0 && (
                    <div className="py-6 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                        No linked alternatives or category substitutes found for this product. You can link alternatives directly on the Product details page.
                    </div>
                )}
            </div>

            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Close</Button>
            </ModalFooter>
        </Modal>
    );
}
