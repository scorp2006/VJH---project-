import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDU-AxVQVunt81Z5wg9U8Lz-NFbpeQW7Yw",
  authDomain: "asio-54790.firebaseapp.com",
  projectId: "asio-54790",
  storageBucket: "asio-54790.firebasestorage.app",
  messagingSenderId: "1013994748503",
  appId: "1:1013994748503:web:1b74c7118202d6e9398112",
  measurementId: "G-QYE4C5KEJB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
