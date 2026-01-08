'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * useLocalStorage hook
 * A hook that syncs state with localStorage, handling SSR hydration properly
 * 
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if nothing is stored
 * @returns A tuple of [storedValue, setValue, removeValue]
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isHydrated, setIsHydrated] = useState(false);

    // Hydrate from localStorage on mount (client-side only)
    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
        }
        setIsHydrated(true);
    }, [key]);

    // Return a wrapped version of useState's setter function that persists to localStorage
    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                // Allow value to be a function so we have same API as useState
                const valueToStore = value instanceof Function ? value(storedValue) : value;

                // Save state
                setStoredValue(valueToStore);

                // Save to local storage
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, storedValue]
    );

    // Function to remove the item from localStorage
    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch (error) {
            console.warn(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
}

/**
 * useLocalStorageState hook
 * Similar to useLocalStorage but returns an object with additional utilities
 */
export function useLocalStorageState<T>(key: string, initialValue: T) {
    const [value, setValue, removeValue] = useLocalStorage<T>(key, initialValue);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    return {
        value,
        setValue,
        removeValue,
        isHydrated,
        reset: () => setValue(initialValue),
    };
}

export default useLocalStorage;
