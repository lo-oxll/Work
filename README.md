# واجهة منصة التوظيف — HTML/CSS/JS ساكن (بدون أي أداة بناء)

لا تحتاج `npm install` ولا `build`. كل الملفات جاهزة للنشر مباشرة.

## النشر على GitHub Pages
1. ارفع محتويات هذا المجلد كاملة إلى المستودع (اسحب وأفلت، ثم اضغط **Commit changes**).
2. Settings → Pages → تأكد أن Source = "Deploy from a branch" والفرع الصحيح مفعّل.
3. الموقع سيعمل مباشرة على `https://username.github.io/repo-name/` — كل المسارات هنا نسبية (`./css/...`)، فلا مشكلة نشر تحت مسار فرعي (بعكس مشروع React السابق).

## قبل النشر: اضبط عنوان الـ backend
افتح `js/config.js` وغيّر:
```js
window.API_BASE_URL = 'https://your-backend-url.onrender.com/api';
```
بدون هذا، كل الطلبات (تسجيل، دخول، نشر إعلان...) ستفشل لأنه لا يوجد سيرفر على GitHub Pages نفسه.

## اختبار محلي
```bash
npx serve .
# أو أي سيرفر ملفات ثابتة آخر، أو حتى فتح index.html مباشرة (بعض المتصفحات تمنع fetch من file://)
```

## نظام الإشعارات (Web Push)
- الموظف يضغط "تفعيل الإشعارات" في لوحته → يوافق على الإذن → يُسجَّل اشتراكه في الـ backend.
- عند نشر شركة لإعلان، الـ backend يحسب المطابقين تلقائيًا ويرسل إشعارًا **فقط لهم**.
- `sw.js` (Service Worker) يستقبل الإشعار ويعرضه حتى لو المتصفح مغلقًا.
- **قيد iOS**: إشعارات المتصفح على iPhone تعمل فقط إذا أضاف المستخدم الموقع للشاشة الرئيسية (Share → Add to Home Screen) وفتحه من هناك، وليس من داخل Safari مباشرة. هذا قيد من Apple.

## البنية
```
index.html
css/styles.css
sw.js                          # Service Worker للإشعارات
js/
  config.js                    # عنوان الـ backend - عدّله هنا فقط
  auth.js                      # حالة تسجيل الدخول (sessionStorage)
  api.js                       # كل نداءات fetch للـ backend
  router.js                    # موجّه hash بسيط (#/route)
  push.js                      # تفعيل/إلغاء إشعارات المتصفح
  components/
    navbar.js
    matchGauge.js               # ختم التوافق - العنصر البصري المميز
  pages/
    home.js, login.js, register.js, forgotPassword.js, resetPassword.js
    employeeDashboard.js         # بروفايل + الوظائف المطابقة + تقديم + طلباتي
    companyDashboard.js          # بروفايل + نشر إعلان + عدد المطابقين + المتقدمون
  main.js                       # يسجّل كل المسارات ويشغّل الموجّه
```

## التدفق المطبَّق
- الشركة تنشر إعلانًا فقط → لا "تطلب" موظفًا يدويًا.
- عند النشر، الـ backend يشعر المطابقين تلقائيًا (Web Push)، ويرجّع للشركة `notified_count` (عدد فقط، بدون أسماء).
- الشركة ترى لاحقًا عدد المطابقين المحدَّث لكل إعلان (`match-count`)، لكن لا ترى قائمتهم.
- الموظف يستلم الإشعار (أو يتصفح تبويب "الوظائف المتاحة لي") ويضغط **تقديم** بنفسه.
- الشركة ترى فقط من **تقدّم فعليًا** (applicants) وتقرر قبول/رفض.
