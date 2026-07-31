// Service Worker بسيط: يستقبل حدث push من الخادم ويعرضه كإشعار،
// ويفتح رابط الوظيفة عند الضغط على الإشعار.

self.addEventListener('push', (event) => {
  let data = { title: 'إشعار جديد', body: '', url: './' };
  try {
    data = event.data.json();
  } catch (e) {
    // تجاهل - استخدم القيم الافتراضية
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'إشعار جديد', {
      body: data.body || '',
      data: { url: data.url || './' },
      dir: 'rtl',
      lang: 'ar',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
