"use client";

import React, { useState, useRef } from 'react';
import { compressImageToWebP } from '@/lib/utils/imageCompressor';
import { uploadToCloudinary } from '@/lib/utils/cloudinary';
import { Upload, Image as ImageIcon, X, Link as LinkIcon, Loader2, Sparkles, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageUploaderProps {
    label?: string;
    value?: string;
    onChange: (url: string) => void;
    placeholder?: string;
    hint?: string;
    aspectRatio?: 'banner' | 'square' | 'avatar';
    className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
    label,
    value,
    onChange,
    placeholder = 'Upload image or paste URL...',
    hint,
    aspectRatio = 'square',
    className = '',
}) => {
    const [isCompressing, setIsCompressing] = useState(false);
    const [mode, setMode] = useState<'upload' | 'url'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsCompressing(true);

            // Try Cloudinary upload first if configured in environment variables
            const cloudinaryUrl = await uploadToCloudinary(file);
            if (cloudinaryUrl) {
                onChange(cloudinaryUrl);
                toast.success('Uploaded to Cloudinary (WebP)!');
                return;
            }

            // Fallback to client-side HTML5 canvas WebP compression
            const compressedWebPUrl = await compressImageToWebP(
                file,
                aspectRatio === 'banner' ? 1600 : 1000,
                aspectRatio === 'banner' ? 400 : 1000,
                0.85
            );
            onChange(compressedWebPUrl);
            toast.success('Image processed!');
        } catch (err: any) {
            console.error('Image processing failed:', err);
            toast.error(err.message || 'Failed to process image');
        } finally {
            setIsCompressing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const heightClass = aspectRatio === 'banner' ? 'aspect-[4/1] w-full max-h-36' : 'h-24';

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <div className="flex items-center justify-between gap-1">
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-200 truncate">
                        {label}
                    </label>
                    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setMode('upload');
                                cameraInputRef.current?.click();
                            }}
                            className="p-1 rounded-md transition-colors text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                            title="Take Photo"
                        >
                            <Camera className="w-3 h-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('upload')}
                            className={`p-1 rounded-md transition-colors ${mode === 'upload' ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs font-medium' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                            title="Upload File"
                        >
                            <Upload className="w-3 h-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('url')}
                            className={`p-1 rounded-md transition-colors ${mode === 'url' ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs font-medium' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                            title="Paste Image URL"
                        >
                            <LinkIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {mode === 'upload' ? (
                <div>
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

                    {value ? (
                        <div className={`relative ${heightClass} bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 group`}>
                            <img src={value} alt="Uploaded preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-white/90 dark:bg-neutral-800/90 text-neutral-800 dark:text-white rounded-lg text-xs font-semibold hover:scale-105 transition-transform"
                                >
                                    Change Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange('')}
                                    className="p-2 bg-rose-500 text-white rounded-lg hover:scale-105 transition-transform"
                                    title="Remove Image"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isCompressing}
                            className={`w-full ${heightClass} border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl flex flex-col items-center justify-center p-3 text-center transition-colors bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${isCompressing ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isCompressing ? (
                                <div className="flex flex-col items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-xs font-semibold">Processing image...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                                    <div className="p-2 bg-white dark:bg-neutral-700 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 text-blue-500">
                                        <Upload className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Click to upload photo</span>
                                        <p className="text-[10px] text-neutral-400">Use the camera icon above to take a picture</p>
                                    </div>
                                </div>
                            )}
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#2d3748] dark:text-white"
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {hint && <p className="text-[11px] text-neutral-400 mt-0.5">{hint}</p>}
        </div>
    );
};
