// Firebase Configuration
// This file initializes Firebase with your project credentials

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyA810_RtC80zNeiQ9QfbIp0jJCm1Oyegog",
    authDomain: "refloww-75b2c.firebaseapp.com",
    projectId: "refloww-75b2c",
    storageBucket: "refloww-75b2c.firebasestorage.app",
    messagingSenderId: "938128551688",
    appId: "1:938128551688:web:e0aaeeb7a72859464f06bd",
    measurementId: "G-BS9FQM6DSP"
};

// Initialize Firebase (prevent double initialization in dev mode with HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
