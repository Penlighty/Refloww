'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface AutoSaveOptions {
    /** Delay in milliseconds before saving (default: 1000ms) */
    delay?: number;
    /** Callback when save starts */
    onSaveStart?: () => void;
    /** Callback when save completes successfully */
    onSaveSuccess?: () => void;
    /** Callback when save fails */
    onSaveError?: (error: Error) => void;
    /** Whether auto-save is enabled (default: true) */
    enabled?: boolean;
}

interface AutoSaveResult {
    /** Whether a save is currently in progress */
    isSaving: boolean;
    /** Whether there are unsaved changes */
    hasUnsavedChanges: boolean;
    /** Timestamp of the last successful save */
    lastSaved: Date | null;
    /** Manually trigger a save */
    saveNow: () => Promise<void>;
    /** Mark content as changed (triggers auto-save timer) */
    markChanged: () => void;
    /** Reset the changed state without saving */
    resetChanges: () => void;
}

/**
 * useAutoSave hook
 * Automatically saves data after a delay when changes are detected
 * 
 * @param data - The data to save
 * @param saveFn - Function that performs the save operation
 * @param options - Configuration options
 */
export function useAutoSave<T>(
    data: T,
    saveFn: (data: T) => Promise<void> | void,
    options: AutoSaveOptions = {}
): AutoSaveResult {
    const {
        delay = 1000,
        onSaveStart,
        onSaveSuccess,
        onSaveError,
        enabled = true,
    } = options;

    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dataRef = useRef(data);
    const isFirstRender = useRef(true);

    // Keep data ref updated
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Save function
    const performSave = useCallback(async () => {
        if (!hasUnsavedChanges || isSaving) return;

        try {
            setIsSaving(true);
            onSaveStart?.();

            await saveFn(dataRef.current);

            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            onSaveSuccess?.();
        } catch (error) {
            onSaveError?.(error as Error);
            console.error('Auto-save failed:', error);
        } finally {
            setIsSaving(false);
        }
    }, [hasUnsavedChanges, isSaving, saveFn, onSaveStart, onSaveSuccess, onSaveError]);

    // Manual save now
    const saveNow = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        await performSave();
    }, [performSave]);

    // Mark as changed
    const markChanged = useCallback(() => {
        setHasUnsavedChanges(true);
    }, []);

    // Reset changes
    const resetChanges = useCallback(() => {
        setHasUnsavedChanges(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Watch for data changes
    useEffect(() => {
        // Skip first render
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (!enabled) return;

        setHasUnsavedChanges(true);

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout for auto-save
        timeoutRef.current = setTimeout(() => {
            performSave();
        }, delay);

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, delay, enabled, performSave]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        isSaving,
        hasUnsavedChanges,
        lastSaved,
        saveNow,
        markChanged,
        resetChanges,
    };
}

/**
 * useAutoSaveForm hook
 * A simplified version for form data that triggers on any field change
 */
export function useAutoSaveForm<T extends Record<string, unknown>>(
    formData: T,
    saveFn: (data: T) => Promise<void> | void,
    options: AutoSaveOptions = {}
) {
    const autoSave = useAutoSave(formData, saveFn, options);

    const handleChange = useCallback(
        <K extends keyof T>(field: K, value: T[K]) => {
            autoSave.markChanged();
            return { [field]: value } as Pick<T, K>;
        },
        [autoSave]
    );

    return {
        ...autoSave,
        handleChange,
    };
}

export default useAutoSave;
