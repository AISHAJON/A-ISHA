importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAdrip4nQTKphRhRkDMpdk1tV1mmCq5g-M",
  authDomain: "aisha-c1cec.firebaseapp.com",
  projectId: "aisha-c1cec",
  storageBucket: "aisha-c1cec.firebasestorage.app",
  messagingSenderId: "544191572432",
  appId: "1:544191572432:web:92793ff8dea76288bd31d5"
});

const messaging = firebase.messaging();

// Fires when the app / browser is fully closed and a push arrives (Android).
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "A'ISHA 🫀";
  const body = (payload.notification && payload.notification.body) || "Я думаю о тебе прямо сейчас...";
  self.registration.showNotification(title, {
    body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'aisha-love'
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
