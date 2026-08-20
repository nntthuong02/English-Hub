
// Firebase Configuration Template
// Người dùng có thể điền thông số từ Firebase Console vào đây
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db = null;
let isFirebaseActive = false;

try {
  if (typeof firebase !== 'undefined' && firebase.initializeApp && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseActive = true;
    console.log("Firebase Firestore initialized successfully!");
  } else {
    console.log("Running in offline-friendly LocalStorage mode (Sync to Firebase enabled once config is provided).");
  }
} catch(e) {
  console.warn("Firebase init note:", e);
}

window.isFirebaseActive = isFirebaseActive;
window.firestoreDb = db;
