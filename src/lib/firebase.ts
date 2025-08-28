

// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALLCGa032vNGAnVnghL-D4QeO-UkmSmiA",
  authDomain: "slcricscorer-9141a.firebaseapp.com",
  databaseURL: "https://slcricscorer-9141a-default-rtdb.firebaseio.com",
  projectId: "slcricscorer-9141a",
  storageBucket: "slcricscorer-9141a.appspot.com",
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
const auth = getAuth(app);
const storage = getStorage(app);

export { db, app, auth, storage };
