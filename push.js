const webpush = require('web-push');
const pool = require('../config/db');
require('dotenv').config();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * يرسل إشعار متصفح لموظف واحد على كل أجهزته المشترِكة.
 * إذا كان الاشتراك منتهي الصلاحية (410/404) يحذفه تلقائيًا من قاعدة البيانات.
 * لا يرمي خطأ للمنادي - إرسال الإشعار عملية "أفضل جهد" ولا يجب أن توقف نشر الإعلان.
 */
async function notifyEmployee(employeeId, payload) {
  const subs = await pool.query('SELECT * FROM push_subscriptions WHERE employee_id = $1', [employeeId]);

  const results = await Promise.allSettled(
    subs.rows.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  );

  results.forEach(async (result, i) => {
    if (result.status === 'rejected') {
      const statusCode = result.reason?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // الاشتراك لم يعد صالحًا (المستخدم ألغى الإذن أو غيّر المتصفح)
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [subs.rows[i].id]).catch(() => {});
      } else {
        console.error('فشل إرسال إشعار:', result.reason?.message);
      }
    }
  });

  return results.filter((r) => r.status === 'fulfilled').length;
}

/**
 * يرسل إشعارًا لكل موظف في القائمة (المطابقين فقط - وليس كل الموظفين)
 */
async function notifyMatchedEmployees(employeeIds, payload) {
  await Promise.allSettled(employeeIds.map((id) => notifyEmployee(id, payload)));
}

module.exports = { notifyEmployee, notifyMatchedEmployees };
