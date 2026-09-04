"use client";

import { Toaster } from 'react-hot-toast';
import { SwipeableToastItem } from './Toast';

export function SwipeableToaster() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 4000,
            }}
        >
            {(t) => <SwipeableToastItem toast={t} />}
        </Toaster>
    );
}
