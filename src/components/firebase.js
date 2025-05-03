import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: 'AIzaSyBRGXkmmaDOl4AuHbDpA4yUOQRk12Wbe-g',
  authDomain: 'snoopy-da3af.firebaseapp.com',
  projectId: 'snoopy-da3af',
  storageBucket: 'snoopy-da3af.firebasestorage.app',
  messagingSenderId: '465428224427',
  appId: '1:465428224427:web:a4ff4d443939452ecd9aee',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
export default app;