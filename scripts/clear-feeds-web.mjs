import admin from "firebase-admin";

// Create a mock credential that allows unauthenticated local emulator access, 
// or run this with GOOGLE_APPLICATION_CREDENTIALS set if hitting prod.
// Since we don't have the service account key easily here, we'll hit the REST API directly 
// or just tell the user to manually clean their Firestore database if programmatic delete fails.
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyChIMcjzU9zXhc_5x6Iurd2_cSws_nD94g",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hackthon-cf7d5.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hackthon-cf7d5",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hackthon-cf7d5.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "813026101855",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:813026101855:web:03b54d16260b0e4c5ba9ea",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearFeeds() {
    console.log("Starting feed cleanup...");
    const feedsRef = collection(db, "feeds");
    const snapshot = await getDocs(feedsRef);

    if (snapshot.empty) {
        console.log("No feeds found to delete.");
        return;
    }

    let count = 0;
    for (const d of snapshot.docs) {
        await deleteDoc(doc(db, "feeds", d.id));
        count++;
    }

    console.log(`Successfully deleted ${count} old feed items.`);
    process.exit(0);
}

clearFeeds().catch(console.error);
