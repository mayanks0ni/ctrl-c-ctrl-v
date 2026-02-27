import { initializeApp } from "firebase/admin/app";
import { getFirestore } from "firebase/admin/firestore";

const app = initializeApp({
    projectId: "hackthon-cf7d5",
});

const db = getFirestore(app);

async function clearFeeds() {
    console.log("Starting feed cleanup...");
    const feedsRef = db.collection("feeds");
    const snapshot = await feedsRef.get();

    if (snapshot.empty) {
        console.log("No feeds found to delete.");
        return;
    }

    let batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
    });

    await batch.commit();
    console.log(`Successfully deleted ${count} old feed items.`);
}

clearFeeds().catch(console.error);
