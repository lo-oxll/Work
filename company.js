const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================
// إنشاء / تحديث بروفايل الشركة
// ============================================
router.put(
  '/profile',
  authenticate,
  requireRole('company'),
  [
    body('company_name').notEmpty(),
    body('location_city').notEmpty(),
    body('location_country').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      company_name, industry, location_city, location_country,
      website, description, commercial_register_number,
    } = req.body;

    try {
      const existing = await pool.query('SELECT id FROM company_profiles WHERE user_id = $1', [req.user.id]);

      if (existing.rows.length > 0) {
        const result = await pool.query(
          `UPDATE company_profiles SET
            company_name=$1, industry=$2, location_city=$3, location_country=$4,
            website=$5, description=$6, commercial_register_number=$7, updated_at=NOW()
           WHERE user_id=$8 RETURNING *`,
          [company_name, industry || null, location_city, location_country, website || null,
           description || null, commercial_register_number || null, req.user.id]
        );
        return res.json(result.rows[0]);
      }

      const result = await pool.query(
        `INSERT INTO company_profiles
          (user_id, company_name, industry, location_city, location_country, website, description, commercial_register_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.user.id, company_name, industry || null, location_city, location_country,
         website || null, description || null, commercial_register_number || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطأ في الخادم' });
    }
  }
);

// ملاحظة: is_verified_business يُفعّلها الأدمن فقط بعد مراجعة السجل التجاري
// -> راجع src/routes/admin.js (مثال) لإضافة نقطة تحقق للأدمن لاحقًا

router.get('/profile/me', authenticate, requireRole('company'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_profiles WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'لا يوجد بروفايل بعد' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ملاحظة: لا يوجد مسار لتصفح الموظفين هنا عمدًا.
// الشركة ترى فقط عدد المطابقين (GET /api/jobs/:id/match-count) وليس هويتهم،
// وترى تفاصيل الموظف فقط بعد أن يتقدّم هو بنفسه (GET /api/jobs/:id/applicants).

module.exports = router;
