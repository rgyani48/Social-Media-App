import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "social-media-app-260aa.firebaseapp.com",
  projectId: "social-media-app-260aa",
  storageBucket: "social-media-app-260aa.firebasestorage.app",
  messagingSenderId: "317020580395",
  appId: "1:317020580395:web:b0c2faedac8a6fc95fd86e",
  measurementId: "G-6NHW9S5KPJ"
};


const app = initializeApp(firebaseConfig);


// const analytics = getAnalytics(app);


// Authentication
export const auth = getAuth(app);


// Firestore Database
export const db = getFirestore(app);

export const storage = getStorage(app);