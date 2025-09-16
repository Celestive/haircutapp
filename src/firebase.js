import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCb17Z-4qATHwLt4vYd4fsZJtdebl-BlA",
  authDomain: "haircutid.firebaseapp.com",
  projectId: "haircutid",
  storageBucket: "haircutid.firebasestorage.app",
  messagingSenderId: "863200276345",
  appId: "1:863200276345:web:9fcf99afac4458bdfa89a8",
  measurementId: "G-QL2HV4DS7D"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
