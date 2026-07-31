# نظام مطابقة الموظفين والشركات

## التشغيل
```bash
npm install
cp .env.example .env   # عدّل القيم (DATABASE_URL, JWT_SECRET, SMTP...)
psql $DATABASE_URL -f db/schema.sql
npm run dev
```

## تدفق الاستخدام

### الموظف
1. `POST /api/auth/register` بـ `role: "employee"` → يصل إيميل تفعيل.
2. `GET /api/auth/verify-email?token=...` (يفتحه المستخدم من الإيميل).
3. `POST /api/auth/login` → يرجّع JWT.
4. `PUT /api/employee/profile` (multipart/form-data مع photo + cv) لملء البيانات.
5. `PATCH /api/employee/availability` لتبديل "متاح/غير متاح".
6. `GET /api/jobs/my-applications` لرؤية عروض الشركات الواصلة له.
7. `PATCH /api/jobs/applications/:id/respond` بـ `status: accepted|rejected`.

### الشركة
1. تسجيل + تفعيل بنفس الطريقة مع `role: "company"`.
2. `PUT /api/company/profile` لملء بيانات الشركة.
3. `POST /api/jobs` لإنشاء إعلان وظيفي.
4. `GET /api/jobs/:id/matches` لرؤية الموظفين المطابقين مع درجة التوافق.
5. `POST /api/jobs/:id/request` → **زر "طلب موظف"**: يولّد رابط واتساب جاهز لكل موظف مطابق ومتاح، مع تسجيل الطلب في applications. الشركة تضغط الرابط لإرسال الرسالة يدويًا (راجع `src/utils/whatsapp.js` لسبب عدم الإرسال التلقائي المباشر).
6. `PATCH /api/jobs/:id/status` بـ `status: open|filled|closed` — "طلب موظف ساري" / "تم تشغيل موظف" / "توقف الإعلان".

## محرك المطابقة
موجود في `src/utils/matching.js`. الأوزان الحالية:
| الحقل | الوزن |
|---|---|
| المسمى الوظيفي | 40 |
| الموقع الجغرافي | 20 |
| سنوات الخبرة | 15 |
| الراتب (تقاطع النطاقين) | 15 |
| نوع الدوام | 10 |

عدّل `WEIGHTS` في نفس الملف حسب أولوياتكم. العتبة الدنيا للعرض `MIN_SCORE = 40` في `src/routes/jobs.js`.

## الحماية من التسجيلات الوهمية
- Rate limiting على `/register` (5 محاولات/ساعة لكل IP) و`/login` (10 محاولات/15 دقيقة).
- تفعيل إلزامي للبريد الإلكتروني قبل تسجيل الدخول.
- قفل الحساب 30 دقيقة بعد 5 محاولات دخول فاشلة.
- حقل honeypot (`website_hp`) في نموذج التسجيل لصيد البوتات.
- تفرّد البريد ورقم الهاتف معًا.
- `is_verified_business` في بروفايل الشركة — يفعّله الأدمن يدويًا بعد مراجعة السجل التجاري (تحتاجون بناء واجهة أدمن بسيطة لهذا لاحقًا).

## ما لم يُبنَ بعد (يحتاج قرار منكم)
- رفع الملفات حاليًا محلي (`multer` → `uploads/`) — للإنتاج استبدله بـ S3 أو مكافئ.
- واجهة الأدمن لتوثيق الشركات (`is_verified_business`) غير مبنية بعد كـ routes.
- الترقية لـ WhatsApp Business API الرسمي عند الحاجة لإرسال تلقائي حقيقي بدل الروابط اليدوية.
- Frontend غير مشمول — هذا backend/API فقط.
