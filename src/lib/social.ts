import { db } from "./firebase/config";
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp,
    arrayUnion,
    deleteDoc,
    getDoc
} from "firebase/firestore";

export interface FriendRequest {
    id: string;
    from: string;
    fromName: string;
    to: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

export async function sendFriendRequest(fromUid: string, fromName: string, toUid: string) {
    const requestsRef = collection(db, "friendRequests");
    // Check if a request already exists
    const q = query(requestsRef,
        where("from", "==", fromUid),
        where("to", "==", toUid),
        where("status", "==", "pending")
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;

    const requestDoc = await addDoc(requestsRef, {
        from: fromUid,
        fromName,
        to: toUid,
        status: 'pending',
        createdAt: serverTimestamp()
    });

    // Send notification
    try {
        const fromUserDoc = await getDoc(doc(db, "users", fromUid));
        let subjectsMsg = "";
        if (fromUserDoc.exists()) {
            const data = fromUserDoc.data();
            const subjects = (data.subjects || []).map((s: any) => typeof s === 'string' ? s : s.name);
            if (subjects.length > 0) {
                subjectsMsg = ` studying ${subjects.slice(0, 2).join(" & ")}`;
            }
        }

        const notifRef = collection(db, `users/${toUid}/notifications`);
        await addDoc(notifRef, {
            type: 'comrade_request',
            fromUserId: fromUid,
            fromUserName: fromName,
            requestId: requestDoc.id,
            message: `${fromName}${subjectsMsg} sent you a comrade request.`,
            link: `/profile?id=${fromUid}`,
            isRead: false,
            createdAt: serverTimestamp()
        });
    } catch (err) {
        console.error("Error sending notification:", err);
    }
}

export async function acceptFriendRequest(requestId: string, fromUid: string, toUid: string) {
    const requestRef = doc(db, "friendRequests", requestId);
    await updateDoc(requestRef, { status: 'accepted' });

    // Add to each other's comrades list
    const fromUserRef = doc(db, "users", fromUid);
    const toUserRef = doc(db, "users", toUid);

    await updateDoc(fromUserRef, {
        comrades: arrayUnion(toUid)
    });
    await updateDoc(toUserRef, {
        comrades: arrayUnion(fromUid)
    });
}

export async function rejectFriendRequest(requestId: string) {
    const requestRef = doc(db, "friendRequests", requestId);
    await updateDoc(requestRef, { status: 'rejected' });
}

export async function getPendingRequests(uid: string) {
    const requestsRef = collection(db, "friendRequests");
    const q = query(requestsRef, where("to", "==", uid), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FriendRequest[];
}

export async function getComrades(uid: string) {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return [];

    const comradeIds = userDoc.data().comrades || [];
    if (comradeIds.length === 0) return [];

    // Fetch user details for each comrade
    const comrades = [];
    for (const id of comradeIds) {
        const d = await getDoc(doc(db, "users", id));
        if (d.exists()) {
            comrades.push({ uid: id, ...d.data() });
        }
    }
    return comrades;
}
