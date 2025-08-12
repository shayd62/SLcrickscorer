
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvGJjesDrzXYt_28tpUF9HsvjKFZ3jpyM",
  authDomain: "slcricscorer-9141a.firebaseapp.com",
  projectId: "slcricscorer-9141a",
  storageBucket: "slcricscorer-9141a.firebasestorage.app",
  messagingSenderId: "745177563751",
  appId: "1:745177563751:web:1a0aa1c3b39bb9c5288ac2",
  measurementId: "G-5YFS1SQNGJ"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { db, app };
