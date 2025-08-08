// js/firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyDY3XhrG-2Cj9y2QvW0RB9afjnW1k-NL6E",
    authDomain: "bamboo-15c88.firebaseapp.com",
    projectId: "bamboo-15c88",
    storageBucket: "bamboo-15c88.firebasestorage.app",
    messagingSenderId: "491968003258",
    appId: "1:491968003258:web:903605a044306b45745683",
    measurementId: "G-B99VR1M772"
  };

const app = firebase.initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = firebase.auth();
const db = firebase.firestore();
