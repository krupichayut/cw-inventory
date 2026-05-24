import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDnbNftBkcBgO5KtKU8OUYPZ_EfvN-tmE",
  authDomain: "cwschool-inventory-15657.firebaseapp.com",
  projectId: "cwschool-inventory-15657",
  storageBucket: "cwschool-inventory-15657.firebasestorage.app",
  messagingSenderId: "764655450418",
  appId: "1:764655450418:web:238b61f4e6a1ad655cff2b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
