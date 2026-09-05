"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Volume2, CheckCircle2, ScanLine } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { playScanBeep } from '@/lib/utils/audio';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (barcodeText: string) => void;
    mode?: 'single' | 'continuous';
    title?: string;
}

export default function BarcodeScannerModal({
    isOpen,
    onClose,
    onScan,
    mode = 'continuous',
    title = 'Scan Barcode'
}: BarcodeScannerModalProps) {
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [lastScanned, setLastScanned] = useState<{ code: string; time: number } | null>(null);
    const [manualInput, setManualInput] = useState<string>('');
    const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
    const isProcessingRef = useRef<boolean>(false);

    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            return;
        }

        const scannerId = 'barcode-reader-container';
        setScannerError(null);

        // Small delay to allow DOM element to render
        const timeoutId = setTimeout(() => {
            startScanner(scannerId);
        }, 150);

        return () => {
            clearTimeout(timeoutId);
            stopScanner();
        };
    }, [isOpen]);

    const startScanner = async (elementId: string) => {
        try {
            if (html5QrcodeRef.current) {
                await stopScanner();
            }

            const element = document.getElementById(elementId);
            if (!element) return;

            // Trigger explicit getUserMedia permission prompt on Android WebView
            if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    stream.getTracks().forEach(track => track.stop());
                } catch (permErr: any) {
                    console.warn('Pre-flight camera permission check:', permErr);
                }
            }

            // Supported formats: EAN-13, EAN-8, UPC-A, UPC-E, CODE-128, CODE-39, QR_CODE
            const formatsToSupport = [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.ITF
            ];

            const html5Qrcode = new Html5Qrcode(elementId, {
                formatsToSupport,
                verbose: false
            });
            html5QrcodeRef.current = html5Qrcode;

            const config = {
                fps: 15,
                qrbox: { width: 280, height: 160 },
                aspectRatio: 1.777778
            };

            await html5Qrcode.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    handleDecodedText(decodedText);
                },
                () => {
                    // Ignored silent per-frame parse failures
                }
            );

            setIsScanning(true);
        } catch (err: any) {
            console.error('Failed to initialize barcode scanner:', err);
            setScannerError(
                err?.message || 'Could not access device camera. Please grant camera permissions or use manual entry.'
            );
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrcodeRef.current) {
            try {
                if (html5QrcodeRef.current.isScanning) {
                    await html5QrcodeRef.current.stop();
                }
                html5QrcodeRef.current.clear();
            } catch (err) {
                console.warn('Error stopping scanner:', err);
            } finally {
                html5QrcodeRef.current = null;
                setIsScanning(false);
            }
        }
    };

    const handleDecodedText = (decodedText: string) => {
        if (isProcessingRef.current) return;
        const now = Date.now();

        // Throttle identical barcode rapid rescans within 1.2 seconds in continuous mode
        if (lastScanned && lastScanned.code === decodedText && now - lastScanned.time < 1200) {
            return;
        }

        isProcessingRef.current = true;
        setLastScanned({ code: decodedText, time: now });

        // Play audio feedback chime
        playScanBeep();

        // Trigger callback
        onScan(decodedText);

        if (mode === 'single') {
            onClose();
        } else {
            // Re-enable scanning processing after short delay
            setTimeout(() => {
                isProcessingRef.current = false;
            }, 1000);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualInput.trim()) return;

        playScanBeep();
        onScan(manualInput.trim());
        setLastScanned({ code: manualInput.trim(), time: Date.now() });
        setManualInput('');

        if (mode === 'single') {
            onClose();
        }
    };

    if (!isOpen) return null;

    if (typeof window === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <ScanLine className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#2d3748] dark:text-white text-base">{title}</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {mode === 'continuous' ? 'Batch mode: keeps camera active for scanning multiple items' : 'Align barcode within the target frame'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Viewport container */}
                    <div className="relative rounded-xl overflow-hidden bg-black min-h-[260px] flex items-center justify-center border border-neutral-800 shadow-inner">
                        <div id="barcode-reader-container" className="w-full h-full min-h-[260px]"></div>

                        {/* Animated Scan Line Overlay */}
                        {isScanning && !scannerError && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-[260px] h-[150px] border-2 border-dashed border-blue-400/80 rounded-xl relative shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                    <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse top-1/2 -translate-y-1/2"></div>
                                </div>
                            </div>
                        )}

                        {scannerError && (
                            <div className="p-6 text-center text-rose-400 text-sm space-y-2">
                                <Camera className="w-10 h-10 mx-auto opacity-50 text-rose-400" />
                                <p>{scannerError}</p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startScanner('barcode-reader-container')}
                                    leftIcon={<RefreshCw className="w-4 h-4" />}
                                    className="mt-2 text-white border-neutral-700"
                                >
                                    Retry Camera
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Scanned Feedback Banner */}
                    {lastScanned && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 text-sm animate-bounce-short">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="font-mono font-semibold">{lastScanned.code}</span>
                            </div>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                <Volume2 className="w-3.5 h-3.5" /> Scanned!
                            </span>
                        </div>
                    )}

                    {/* Manual Entry Fallback */}
                    <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <Input
                            placeholder="Or type/scan barcode manually..."
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" variant="primary" disabled={!manualInput.trim()}>
                            Add
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Hardware USB/Bluetooth scanners can also scan directly into inputs.
                    </span>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
