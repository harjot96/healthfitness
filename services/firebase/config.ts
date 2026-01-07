import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDp3uqr4Q8rIQev41gjrStPNrc17k7BF3Q",
  authDomain: "fitness-712c2.firebaseapp.com",
  projectId: "fitness-712c2",
  storageBucket: "fitness-712c2.firebasestorage.app",
  messagingSenderId: "1037172894910",
  appId: "1:1037172894910:web:071a8ee2a05bda988cc2ef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore - using default database
// getFirestore(app) automatically connects to the "(default)" database
export const db = getFirestore(app);

// Verify Firestore connection
console.log('[Firebase] Initialized with project:', firebaseConfig.projectId);
console.log('[Firebase] Firestore database: (default)');
console.log('[Firebase] Firestore instance created');

export default app;

