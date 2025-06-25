// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// Config ที่มึงได้มานั่นแหละ
const firebaseConfig = {
  apiKey: "AIzaSyDGqqmqQ8w_JOx51VZYzwLW3egfaa53aRU",
  authDomain: "adisak-9d515.firebaseapp.com",
  projectId: "adisak-9d515",
  storageBucket: "adisak-9d515.appspot.com", 
  messagingSenderId: "1050696777304",
  appId: "1:1050696777304:web:6958cb360f0dfbe9b4142d",
  measurementId: "G-VPBXR0VHC2"
};

// Init Firebase app
const app = initializeApp(firebaseConfig);

// Export ที่ใช้บ่อย
export const auth = getAuth(app);
export const db = getFirestore(app);
