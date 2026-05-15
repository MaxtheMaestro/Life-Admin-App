self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Life Admin';
  const options = {
    body: data.body || 'You have a new reminder.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...data.options
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
