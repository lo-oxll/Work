const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { calculateMatchScore } = require('../utils/matching');
const { notifyMatchedEmployees } = require('../utils/push');

const router = express.Router();

const MIN_SCORE = 40; // عتبة أدنى لاعتبار الموظف "مطابقًا" - قابلة للتعديل

// دالة مساعدة: يحسب المطابقين المتاحين لإعلان معيّن
async function getMatchedEmployees(job) {
  const employeesResult = await pool.query('SELECT * FROM employee_profiles WHERE is_available = TRUE');
  return employeesResult.rows
    .map((emp) => ({ employee: emp, ...calculateMatchScore(job, emp) }))
    .filter((m) => m.total >= MIN_SCORE)
    .sort((a, b) => b.total - a.total);
}

// ============================================
// إنشاء إعلان وظيفي + إشعار تلقائي فوري للموظفين المطابقين فقط
// ============================================
router.post(
  '/',
  authenticate,
  requireRole('company'),
  [
    body('title').notEmpty(),
    body('location_city').notEmpty(),
    body('location_country').notEmpty(),
    body('work_type').isIn(['full_time', 'part_time', 'remote', 'contract', 'freelance']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const companyResult = await pool.query(
        'SELECT id, company_name FROM company_profiles WHERE user_id = $1',
        [req.user.id]
      );
      if (companyResult.rows.length === 0) {
        return res.status(400).json({ error: 'أكمل بروفايل الشركة أولاً' });
      }
      const company = companyResult.rows[0];

      const {
        title, description, location_city, location_country,
        min_years_experience, salary_min, salary_max, work_type,
        work_hours, required_skills, conditions,
      } = req.body;

      const skillsArray = Array.isArray(required_skills)
        ? required_skills
        : (required_skills ? required_skills.split(',').map((s) => s.trim()) : []);

      const jobResult = await pool.query(
        `INSERT INTO job_postings
          (company_id, title, description, location_city, location_country, min_years_experience,
           salary_min, salary_max, work_type, work_hours, required_skills, conditions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [company.id, title, description || null, location_city, location_country,
         min_years_experience || 0, salary_min || null, salary_max || null, work_type,
         work_hours || null, skillsArray, conditions || null]
      );
      const job = jobResult.rows[0];

      // --- الإشعار التلقائي: فقط للموظفين المطابقين والمتاحين، وليس كل الموظفين ---
      const matches = await getMatchedEmployees(job);
      notifyMatchedEmployees(
        matches.map((m) => m.employee.id),
        {
          title: 'فرصة عمل قد تناسبك',
          body: `${company.company_name}: ${job.title} — ${job.location_city}`,
          url: `/#/job/${job.id}`,
        }
      ).catch((err) => console.error('خطأ في إرسال الإشعارات:', err));

      res.status(201).json({ ...job, notified_count: matches.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  }
);

// ============================================
// جلب كل إعلانات الشركة الحالية (لوحة تحكم الشركة)
// ============================================
router.get('/mine', authenticate, requireRole('company'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT jp.* FROM job_postings jp
       JOIN company_profiles cp ON jp.company_id = cp.id
       WHERE cp.user_id = $1
       ORDER BY jp.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ============================================
// عدد الموظفين المطابقين فقط (بدون كشف هويتهم) - للشركة
// ============================================
router.get('/:id/match-count', authenticate, requireRole('company'), async (req, res) => {
  try {
    const jobResult = await pool.query(
      `SELECT jp.* FROM job_postings jp
       JOIN company_profiles cp ON jp.company_id = cp.id
       WHERE jp.id = $1 AND cp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (jobResult.rows.length === 0) return res.status(404).json({ error: 'الإعلان غير موجود' });

    const matches = await getMatchedEmployees(jobResult.rows[0]);
    res.json({ count: matches.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ============================================
// المتقدمون فعليًا على إعلان معيّن (للشركة) - فقط من قدّم بنفسه
// ============================================
router.get('/:id/applicants', authenticate, requireRole('company'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id AS application_id, a.status, a.match_score, a.applied_at,
              ep.id AS employee_id, ep.full_name, ep.photo_url, ep.cv_url, ep.job_title,
              ep.location_city, ep.years_experience, u.phone
       FROM applications a
       JOIN employee_profiles ep ON a.employee_id = ep.id
       JOIN users u ON ep.user_id = u.id
       JOIN job_postings jp ON a.job_id = jp.id
       JOIN company_profiles cp ON jp.company_id = cp.id
       WHERE a.job_id = $1 AND cp.user_id = $2
       ORDER BY a.applied_at DESC`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ============================================
// قرار الشركة تجاه متقدم: قبول / رفض
// ============================================
router.patch('/applications/:applicationId/decision', authenticate, requireRole('company'), async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'الحالة يجب أن تكون accepted أو rejected' });
  }
  try {
    const result = await pool.query(
      `UPDATE applications a SET status = $1, decided_at = NOW()
       FROM job_postings jp, company_profiles cp
       WHERE a.id = $2 AND a.job_id = jp.id AND jp.company_id = cp.id AND cp.user_id = $3
       RETURNING a.*`,
      [status, req.params.applicationId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'الطلب غير موجود أو لا تملك صلاحية' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ============================================
// تحديث حالة الإعلان: open (ساري) / filled (تم تشغيل موظف) / closed (توقف الإعلان)
// ============================================
router.patch('/:id/status', authenticate, requireRole('company'), async (req, res) => {
  const { status } = req.body;
  if (!['open', 'filled', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة' });
  }
  try {
    const result = await pool.query(
      `UPDATE job_postings jp SET status = $1, updated_at = NOW()
       FROM company_profiles cp
       WHERE jp.id = $2 AND jp.company_id = cp.id AND cp.user_id = $3
       RETURNING jp.*`,
      [status, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'الإعلان غير موجود أو لا تملك صلاحية' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ============================================
// الوظائف المفتوحة المطابقة للموظف الحالي (يستعرضها بعد استلام الإشعار)
// ============================================
router.get('/matched-for-me', authenticate, requireRole('employee'), async (req, res) => {
  try {
    const empResult = await pool.query('SELECT * FROM employee_profiles WHERE user_id = $1', [req.user.id]);
    if (empResult.rows.length === 0) return res.status(400).json({ error: 'أكمل بروفايلك أولاً' });
    const employee = empResult.rows[0];

    const jobsResult = await pool.query(
      `SELECT jp.*, cp.company_name FROM job_postings jp
       JOIN company_profiles cp ON jp.company_id = cp.id
       WHERE jp.status = 'open'`
    );

    const alreadyApplied = await pool.query(
      'SELECT job_id FROM applications WHERE employee_id = $1',
      [employee.id]
    );
    const appliedSet = new Set(alreadyApplied.rows.map((r) => r.job_id));

    const matches = jobsResult.rows
      .map((job) => ({ job, ...calculateMatchScore(job, employee) }))
      .filter((m) => m.total >= MIN_SCORE)
      .sort((a, b) => b.total - a.total)
      .map((m) => ({ ...m, already_applied: appliedSet.has(m.job.id) }));

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ============================================
// تقديم الموظف بنفسه على إعلان
// ============================================
router.post('/:id/apply', authenticate, requireRole('employee'), async (req, res) => {
  try {
    const empResult = await pool.query('SELECT * FROM employee_profiles WHERE user_id = $1', [req.user.id]);
    if (empResult.rows.length === 0) return res.status(400).json({ error: 'أكمل بروفايلك أولاً' });
    const employee = empResult.rows[0];

    const jobResult = await pool.query(`SELECT * FROM job_postings WHERE id = $1`, [req.params.id]);
    if (jobResult.rows.length === 0) return res.status(404).json({ error: 'الإعلان غير موجود' });
    const job = jobResult.rows[0];

    if (job.status !== 'open') {
      return res.status(400).json({ error: 'الإعلان غير ساري حاليًا' });
    }

    const { total } = calculateMatchScore(job, employee);

    const result = await pool.query(
      `INSERT INTO applications (job_id, employee_id, status, match_score)
       VALUES ($1, $2, 'pending', $3)
       ON CONFLICT (job_id, employee_id) DO NOTHING
       RETURNING *`,
      [job.id, employee.id, total]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'تقدّمت على هذا الإعلان مسبقًا' });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ============================================
// فهرس: طلبات الموظف الحالي (اللي قدّمها بنفسه) وحالتها
// ============================================
router.get('/my-applications', authenticate, requireRole('employee'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, jp.title, jp.location_city, jp.salary_min, jp.salary_max, jp.status AS job_status, cp.company_name
       FROM applications a
       JOIN employee_profiles ep ON a.employee_id = ep.id
       JOIN job_postings jp ON a.job_id = jp.id
       JOIN company_profiles cp ON jp.company_id = cp.id
       WHERE ep.user_id = $1
       ORDER BY a.applied_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
