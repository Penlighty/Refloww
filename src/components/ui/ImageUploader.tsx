"use client";

import React, { useState, useRef } from 'react';
import { compressImageToWebP } from '@/lib/utils/imageCompressor';
import { uploadToCloudinary } from '@/lib/utils/cloudinary';
import {
    Upload,
    Camera,
    Link as LinkIcon,
    X,
    Loader2,
    Eye,
    Trash2,
    Plus,
    Check,
    ExternalLink,
    Maximize2,
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from './Modal';
import { Input } from './Input';

interface ImageUploaderProps {
    label?: string;
    value?: string;
    onChange: (url: string) => void;
    placeholder?: string;
    hint?: string;
    aspectRatio?: 'banner' | 'square' | 'avatar';
    className?: string;
    compact?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
    label,
    value,
    onChange,
    hint,
    aspectRatio = 'square',
    className = '',
}) => {
    const [isCompressing, setIsCompressing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileProcess = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }

        try {
            setIsCompressing(true);

            // 1. Cloudinary upload if available
            const cloudinaryUrl = await uploadToCloudinary(file);
            if (cloudinaryUrl) {
                onChange(cloudinaryUrl);
                toast.success('Image uploaded successfully');
                return;
            }

            // 2. Local WebP compression fallback
            const compressedWebPUrl = await compressImageToWebP(
                file,
                aspectRatio === 'banner' ? 1400 : 800,
                aspectRatio === 'banner' ? 400 : 800,
                0.85
            );
            onChange(compressedWebPUrl);
            toast.success('Image processed successfully');
        } catch (err: any) {
            console.error('Image upload failed:', err);
            toast.error(err.message || 'Failed to process image');
        } finally {
            setIsCompressing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileProcess(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) handleFileProcess(file);
    };

    const handleApplyUrl = () => {
        const cleanUrl = urlInput.trim();
        if (!cleanUrl) {
            toast.error('Please enter a valid image URL');
            return;
        }
        onChange(cleanUrl);
        setUrlInput('');
        setIsUrlModalOpen(false);
        toast.success('Image URL applied');
    };

    // Container aspect ratio styling
    const aspectContainerClass =
        aspectRatio === 'banner'
            ? 'aspect-[3/1] w-full'
            : aspectRatio === 'avatar'
            ? 'w-24 h-24 rounded-full mx-auto'
            : 'aspect-square w-full';

    return (
        <div className={`space-y-1.5 ${className}`}>
            {/* Hidden Native File & Camera Inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Header Label (Clean, concise, no awkward badge crowding text) */}
            {label && (
                <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider truncate">
                        {label}
                    </label>
                    {value && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3" /> Attached
                        </span>
                    )}
                </div>
            )}

            {/* Main Upload Box */}
            {value ? (
                /* STATE A: HAS IMAGE VALUE */
                <div
                    className={`relative ${aspectContainerClass} bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xs group transition-all duration-200`}
                >
                    <img
                        src={value}
                        alt="Uploaded preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Dark Glass Hover Action Overlay */}
                    <div className="absolute inset-0 bg-neutral-950/65 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                        {/* Top bar: Inspect badge */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsPreviewModalOpen(true)}
                                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-colors"
                                title="Inspect Fullscreen"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Bottom bar: Action controls */}
                        <div className="flex items-center justify-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2.5 py-1.5 bg-white text-neutral-900 rounded-xl text-xs font-bold shadow-md hover:bg-neutral-100 transition-all flex items-center gap-1 cursor-pointer"
                                title="Change photo"
                            >
                                <Upload className="w-3 h-3 text-[#fc6d2d]" />
                                <span>Change</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-colors"
                                title="Take new photo"
                            >
                                <Camera className="w-3.5 h-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setUrlInput(value);
                                    setIsUrlModalOpen(true);
                                }}
                                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-colors"
                                title="Edit URL"
                            >
                                <LinkIcon className="w-3.5 h-3.5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl backdrop-blur-md transition-colors"
                                title="Remove photo"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* STATE B: EMPTY DROPZONE CARD */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative ${aspectContainerClass} border-2 border-dashed rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all duration-200 overflow-hidden group ${
                        isDragging
                            ? 'border-[#fc6d2d] bg-[#fc6d2d]/10 scale-[1.01] ring-4 ring-[#fc6d2d]/15'
                            : 'border-neutral-200 dark:border-neutral-700/80 hover:border-[#fc6d2d] dark:hover:border-[#fc6d2d] bg-neutral-50/60 dark:bg-neutral-800/30 hover:bg-orange-50/30 dark:hover:bg-orange-950/10'
                    } ${isCompressing ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isCompressing ? (
                        <div className="flex flex-col items-center gap-1.5 text-blue-600 dark:text-blue-400 p-2">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-[11px] font-bold">Optimizing image...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full gap-2">
                            {/* Graphic Icon Circle */}
                            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-neutral-700/80 border border-neutral-200/80 dark:border-neutral-600 flex items-center justify-center shadow-2xs group-hover:scale-110 group-hover:border-[#fc6d2d]/40 transition-all duration-200">
                                <Plus className="w-4 h-4 text-neutral-400 dark:text-neutral-300 group-hover:text-[#fc6d2d]" />
                            </div>

                            {/* Dropzone Primary Text */}
                            <div className="space-y-0.5">
                                <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200 group-hover:text-[#fc6d2d] transition-colors">
                                    Upload Photo
                                </p>
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 hidden sm:block">
                                    Drag & drop or click
                                </p>
                            </div>

                            {/* Source Quick-Pill Trigger Bar */}
                            <div
                                className="flex items-center gap-1 pt-1"
                                onClick={(e) => e.stopPropagation()} // Prevent double-triggering parent file dialog
                            >
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-2 py-1 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-lg text-[10px] font-bold border border-neutral-200 dark:border-neutral-600 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                    title="Choose Local File"
                                >
                                    <Upload className="w-3 h-3 text-[#fc6d2d]" />
                                    <span>Browse</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="p-1 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-2xs transition-all cursor-pointer"
                                    title="Take Camera Photo"
                                >
                                    <Camera className="w-3 h-3 text-purple-500" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setUrlInput('');
                                        setIsUrlModalOpen(true);
                                    }}
                                    className="p-1 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-2xs transition-all cursor-pointer"
                                    title="Paste Image Link / URL"
                                >
                                    <LinkIcon className="w-3 h-3 text-emerald-500" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {hint && <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{hint}</p>}

            {/* Modal 1: URL Entry Drawer / Modal */}
            <Modal
                isOpen={isUrlModalOpen}
                onClose={() => setIsUrlModalOpen(false)}
                title="Attach Image via Web URL"
                size="sm"
            >
                <div className="space-y-4 py-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Paste a direct HTTPS image URL from the web (e.g. Unsplash, Cloudinary, Shopify).
                    </p>

                    <Input
                        label="Image URL"
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        autoFocus
                        leftIcon={<LinkIcon className="w-4 h-4 text-neutral-400" />}
                    />

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setIsUrlModalOpen(false)}
                            className="px-3.5 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyUrl}
                            className="px-4 py-2 bg-[#fc6d2d] hover:bg-[#e05b1f] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                            Apply Image
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal 2: High-Res Image Inspection Lightbox */}
            <Modal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                title="Image Inspection Preview"
                size="lg"
            >
                {value && (
                    <div className="space-y-4 py-2">
                        <div className="max-h-[60vh] bg-neutral-950 rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-neutral-800 shadow-2xl">
                            <img
                                src={value}
                                alt="Full resolution view"
                                className="max-h-[55vh] w-auto object-contain rounded-xl"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                            <span className="font-mono text-neutral-400 truncate max-w-xs sm:max-w-md">
                                {value}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={value}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white font-bold inline-flex items-center gap-1.5"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> Full URL
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    className="px-4 py-1.5 rounded-xl bg-[#fc6d2d] text-white font-bold"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};


