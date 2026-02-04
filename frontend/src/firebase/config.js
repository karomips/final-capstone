import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDYc03soSK8Vsdwt8gSjGVZlTl1HuGT5es",
  authDomain: "capstone-final-bc063.firebaseapp.com",
  projectId: "capstone-final-bc063",
  storageBucket: "capstone-final-bc063.firebasestorage.app",
  messagingSenderId: "521692817376",
  appId: "1:521692817376:web:8e222c1ca3898a40282d85",
  measurementId: "G-204H3VWW98"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
