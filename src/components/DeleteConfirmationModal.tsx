import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmationText?: string;
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmationText = 'DELETE'
}: DeleteConfirmationModalProps) {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const handleConfirm = () => {
        if (inputValue === confirmationText) {
            onConfirm();
            setInputValue('');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500">
                    <AlertTriangle className="w-8 h-8" />
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                    {description}
                </p>

                <div className="p-4 mb-6 bg-red-50 rounded-xl dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Please type <strong>{confirmationText}</strong> to confirm:
                    </label>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:text-white"
                        placeholder={confirmationText}
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setInputValue('');
                            onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={inputValue !== confirmationText}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Permanently Delete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
