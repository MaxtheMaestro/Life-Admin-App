self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Life Admin';
  const options = {
    body: data.body || 'You have a new reminder.',
    icon: '/life-admin-icon-192.png',
    badge: '/life-admin-icon-192.png',
    ...data.options
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('fetch', () => {});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
