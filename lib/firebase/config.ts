// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBeHHOeAVX1AHpnL8h5v8gd6yLyDGIGUv4",
    authDomain: "fir-db-gdx2.firebaseapp.com",
    projectId: "firebase-db-gdx2",
    storageBucket: "firebase-db-gdx2.firebasestorage.app",
    messagingSenderId: "102895449534",
    appId: "1:102895449534:web:c0426dbfd2c9eb947d35ef",
    measurementId: "G-7KTWCSEZ7Y"
  };

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };