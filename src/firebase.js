import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

export const firebaseConfig = {
  apiKey: "AIzaSyDg7NVoVwDbpt1lZ2AEDogdu3c7dTT_5x4",
  authDomain: "isct-sync.firebaseapp.com",
  projectId: "isct-sync",
  storageBucket: "isct-sync.firebasestorage.app",
  messagingSenderId: "984997101078",
  appId: "1:984997101078:web:9a595e2c0d6b5ee3287f37"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app); // ← app初期化後に移動

if (location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { app };