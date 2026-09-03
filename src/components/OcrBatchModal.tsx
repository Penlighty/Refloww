"use client";

import { useState, useRef } from 'react';
import { Modal, ModalFooter, Button, Input, Textarea, ImageUploader, PageHelpModal } from '@/components/ui';
import { scanImageForBatchDetails, OcrScanResult } from '@/lib/utils/ocrService';
import { generateAutoBatchNumber } from '@/lib/utils/inventoryUtils';
import { useProductStore, useSettingsStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
    Scan,
    Sparkles,
    Calendar,
    Hash,
    Package,
    Truck,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Wand2,
    Camera
} from 'lucide-react';

interface OcrBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    onBatchCreated?: () => void;
}

export default function OcrBatchModal({
    isOpen,
    onClose,
    productId,
    productName,
    onBatchCreated
}: OcrBatchModalProps) {
    const { addStockBatch, batches } = useProductStore();
    const { company } = useSettingsStore();

    // Mode: 'scan' | 'form'
    const [mode, setMode] = useState<'scan' | 'form'>('scan');

    // Scanning state
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatusText, setScanStatusText] = useState('');
    const [scannedImage, setScannedImage] = useState<string | null>(null);
    const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        batchNumber: '',
        receivedDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        initialQuantity: 10,
        costPrice: 0,
        supplier: '',
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleImageSelect = async (imageDataUrl: string) => {
        setScannedImage(imageDataUrl);
        setIsScanning(true);
        setScanProgress(10);
        setScanStatusText('Initializing Tesseract OCR engine...');

        try {
            const result: OcrScanResult = await scanImageForBatchDetails(
                imageDataUrl,
                (progress, status) => {
                    setScanProgress(Math.round(progress * 100));
                    setScanStatusText(status);
                }
            );

            setOcrConfidence(Math.round(result.confidence));

            // Auto-populate form with detected or fallback values
            setFormData({
                batchNumber: result.batchNumber || generateAutoBatchNumber(batches),
                receivedDate: result.receivedDate || new Date().toISOString().split('T')[0],
                expiryDate: result.expiryDate || '',
                initialQuantity: result.quantity || 10,
                costPrice: result.costPrice || 0,
                supplier: result.supplier || '',
                notes: result.batchNumber
                    ? `Scanned via OCR (Confidence: ${Math.round(result.confidence)}%)`
                    : 'Created via OCR scan'
            });

            setIsScanning(false);
            setMode('form');
            toast.success('OCR Scan complete! Please review detected details.');
        } catch (error) {
            console.error('OCR Error:', error);
            setIsScanning(false);
            toast.error('Could not extract text from image. You can enter details manually.');
            // Fallback to manual form
            setFormData(prev => ({
                ...prev,
                batchNumber: generateAutoBatchNumber(batches)
            }));
            setMode('form');
        }
    };

    const handleAutoGenerateBatch = () => {
        const autoNumber = generateAutoBatchNumber(batches);
        setFormData(prev => ({
            ...prev,
            batchNumber: autoNumber
        }));
        toast.success(`Generated batch code "${autoNumber}"`);
    };

    const setExpiryPreset = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        setFormData(prev => ({
            ...prev,
            expiryDate: date.toISOString().split('T')[0]
        }));
    };

    const validateForm = (): boolean => {
        const errs: Record<string, string> = {};
        if (!formData.batchNumber.trim()) errs.batchNumber = 'Batch number is required';
        if (!formData.receivedDate) errs.receivedDate = 'Date received is required';
        if (formData.initialQuantity <= 0) errs.initialQuantity = 'Quantity must be at least 1';

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        addStockBatch(productId, {
            batchNumber: formData.batchNumber.trim().toUpperCase(),
            receivedDate: formData.receivedDate,
            expiryDate: formData.expiryDate || undefined,
            initialQuantity: Number(formData.initialQuantity),
            costPrice: formData.costPrice > 0 ? Number(formData.costPrice) : undefined,
            supplier: formData.supplier.trim() || undefined,
            notes: formData.notes.trim() || undefined
        });

        toast.success(`Batch #${formData.batchNumber} added successfully!`);
        onBatchCreated?.();
        handleResetAndClose();
    };

    const handleResetAndClose = () => {
        setMode('scan');
        setIsScanning(false);
        setScannedImage(null);
        setOcrConfidence(null);
        setFormData({
            batchNumber: '',
            receivedDate: new Date().toISOString().split('T')[0],
            expiryDate: '',
            initialQuantity: 10,
            costPrice: 0,
            supplier: '',
            notes: ''
        });
        setErrors({});
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleResetAndClose}
            title={
                <div className="flex items-center gap-2">
                    <span>{mode === 'scan' ? `Add Batch / Scan Packaging for ${productName}` : `Review & Confirm Batch for ${productName}`}</span>
                    <PageHelpModal
                        title="OCR Batch Scanner & Entry"
                        description="Snap or upload product packaging photos or delivery invoices. Tesseract OCR automatically extracts batch numbers, expiry dates, quantities, cost prices, and supplier details."
                        terms={[
                            { term: 'Lot / Batch Number', definition: 'Unique code assigned by the manufacturer or supplier to identify a specific production run or shipment.' },
                            { term: 'Expiry Presets', definition: 'Quick buttons (+30d, +90d, +6mo, +1yr) to set expiration dates rapidly without opening a calendar picker.' }
                        ]}
                        tips={[
                            "Ensure good lighting when snapping product packaging photos for best OCR text accuracy."
                        ]}
                    />
                </div>
            }
            size="lg"
        >
            {mode === 'scan' && !isScanning && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30 border border-violet-100 dark:border-violet-800/40 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-violet-600 text-white rounded-lg shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Smart Packaging & Document OCR Scanner</h4>
                                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                    Snap or upload a picture of the <strong>product box, bottle label, price tag, or delivery receipt</strong>. Our browser-based AI automatically detects batch number, expiry date, supplier, and price!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Option 1: OCR Scan Image */}
                        <div className="p-5 border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-2xl bg-white dark:bg-neutral-800 hover:border-violet-500 transition-colors flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                                <Camera className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Scan Picture with OCR</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Upload or capture photo of bottle, box, label, or invoice</p>

                            <ImageUploader
                                value=""
                                onChange={(url) => handleImageSelect(url)}
                                label="Upload/Capture Image"
                                className="w-full"
                            />
                        </div>

                        {/* Option 2: Quick Manual Entry */}
                        <div className="p-5 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/50 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                                <Wand2 className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Quick 1-Click Auto Batch</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Skip scanning and auto-generate batch code instantly</p>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        batchNumber: generateAutoBatchNumber(batches)
                                    }));
                                    setMode('form');
                                }}
                                leftIcon={<Wand2 className="w-4 h-4 text-violet-600" />}
                                className="w-full"
                            >
                                Auto-Generate Batch
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isScanning && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                        <Loader2 className="w-16 h-16 text-violet-600 animate-spin" />
                        <Scan className="w-8 h-8 text-violet-500 absolute" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Analyzing Image with Tesseract OCR...</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{scanStatusText}</p>

                    <div className="w-full max-w-xs bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-violet-500 to-blue-500 h-full transition-all duration-300"
                            style={{ width: `${scanProgress}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mt-2">{scanProgress}%</span>
                </div>
            )}

            {mode === 'form' && !isScanning && (
                <div className="space-y-4">
                    {scannedImage && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                                    OCR Detection Completed ({ocrConfidence}% confidence)
                                </p>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                                    Double-check extracted values below before saving.
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setMode('scan')}>Rescan</Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Batch Number */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Batch / Lot Number *</label>
                                <button
                                    type="button"
                                    onClick={handleAutoGenerateBatch}
                                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 font-medium"
                                >
                                    <Wand2 className="w-3 h-3" /> Auto-Generate
                                </button>
                            </div>
                            <Input
                                placeholder="e.g. BATCH-20260826-01"
                                value={formData.batchNumber}
                                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value.toUpperCase() })}
                                error={errors.batchNumber}
                                leftIcon={<Hash className="w-4 h-4 text-violet-500" />}
                            />
                        </div>

                        {/* Received Date */}
                        <Input
                            label="Date Received *"
                            type="date"
                            value={formData.receivedDate}
                            onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                            error={errors.receivedDate}
                            leftIcon={<Calendar className="w-4 h-4 text-blue-500" />}
                        />

                        {/* Expiry Date with Presets */}
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                    Expiry Date <span className="text-neutral-400 font-normal">(Optional — Leave empty if no expiry)</span>
                                </label>
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-neutral-400 mr-1">Quick presets:</span>
                                    <button type="button" onClick={() => setExpiryPreset(30)} className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 font-medium">+30d</button>
                                    <button type="button" onClick={() => setExpiryPreset(90)} className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 font-medium">+90d</button>
                                    <button type="button" onClick={() => setExpiryPreset(180)} className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 font-medium">+6mo</button>
                                    <button type="button" onClick={() => setExpiryPreset(365)} className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 font-medium">+1yr</button>
                                </div>
                            </div>
                            <Input
                                type="date"
                                value={formData.expiryDate}
                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                leftIcon={<Calendar className="w-4 h-4 text-rose-500" />}
                            />
                        </div>

                        {/* Initial Quantity */}
                        <Input
                            label="Received Quantity *"
                            type="number"
                            min="1"
                            placeholder="10"
                            value={formData.initialQuantity || ''}
                            onChange={(e) => setFormData({ ...formData, initialQuantity: parseInt(e.target.value, 10) || 0 })}
                            error={errors.initialQuantity}
                            leftIcon={<Package className="w-4 h-4 text-emerald-500" />}
                        />

                        {/* Cost Price */}
                        <Input
                            label={`Unit Cost Price (${company.currency})`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.costPrice || ''}
                            onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                            leftIcon={<DollarSign className="w-4 h-4 text-amber-500" />}
                        />

                        {/* Supplier */}
                        <div className="md:col-span-2">
                            <Input
                                label="Supplier / Vendor Name"
                                placeholder="e.g. Acme Pharmaceuticals Ltd"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                leftIcon={<Truck className="w-4 h-4 text-purple-500" />}
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <Textarea
                                label="Notes / Invoice Reference"
                                placeholder="e.g. PO #109, received in good condition"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            )}

            <ModalFooter>
                <Button variant="ghost" onClick={handleResetAndClose}>Cancel</Button>
                {mode === 'form' && (
                    <Button onClick={handleSubmit} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                        Save Batch & Add Stock
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
}
