// Firebase Configuration & Initialization
const firebaseConfig = {
  apiKey: "AIzaSyDn8H0ez6A3I6LkFlndBz2IcAtpLFOPrBk",
  authDomain: "english-hub-d8edd.firebaseapp.com",
  projectId: "english-hub-d8edd",
  storageBucket: "english-hub-d8edd.firebasestorage.app",
  messagingSenderId: "1046646888060",
  appId: "1:1046646888060:web:b851875cb9f7ac644c9bf9"
};

let db = null;
let isFirebaseActive = false;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    isFirebaseActive = true;
    console.log("✅ Firebase Cloud Firestore connected successfully to project: english-hub-d8edd");
  } else {
    console.log("Firebase SDK not loaded, running in LocalStorage mode.");
  }
} catch(e) {
  console.warn("Firebase initialization warning:", e);
}

window.isFirebaseActive = isFirebaseActive;
window.firestoreDb = db;
