// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "studio-6079106449-cf583",
  appId: "1:574767759997:web:a098dcd67797dde00b2714",
  apiKey: "AIzaSyCuDzDd6YMZhKa20nl7jxfbKbBfR4gsalY",
  authDomain: "studio-6079106449-cf583.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "574767759997",
  storageBucket: "studio-6079106449-cf583.appspot.com"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
