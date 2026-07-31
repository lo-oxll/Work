// يحوّل مفتاح VAPID العام من base64 إلى Uint8Array (مطلوب لـ PushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const pushNotifications = {
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  async enable() {
    if (!this.isSupported()) {
      throw new Error('متصفحك لا يدعم إشعارات الويب (على iPhone: أضف الموقع للشاشة الرئيسية أولًا)');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('لم تتم الموافقة على إذن الإشعارات');
    }

    const registration = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;

    const { publicKey } = await api.getVapidPublicKey();
    if (!publicKey) {
      throw new Error('لم يتم إعداد مفاتيح الإشعارات في الخادم بعد');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await api.subscribePush(subscription.toJSON());
    return true;
  },

  async disable() {
    if (!this.isSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await api.unsubscribePush(subscription.endpoint).catch(() => {});
      await subscription.unsubscribe();
    }
  },
};
