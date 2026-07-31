async function renderCompanyDashboard(container) {
  if (!requireAuth('company')) return;

  let profile = null;
  try { profile = await api.getMyCompanyProfile(); } catch { /* لا يوجد بروفايل بعد */ }

  container.innerHTML = `
    <div class="page-wide">
      <h1 class="page-title">لوحة الشركة</h1>

      <div class="tabs" id="tabs">
        <button class="tab active" data-tab="jobs">إعلاناتي</button>
        <button class="tab" data-tab="new">إعلان جديد</button>
        <button class="tab" data-tab="profile">بيانات الشركة</button>
      </div>

      <div id="tab-jobs" class="tab-panel"></div>
      <div id="tab-new" class="tab-panel hidden"></div>
      <div id="tab-profile" class="tab-panel hidden"></div>
    </div>`;

  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    ['jobs', 'new', 'profile'].forEach((t) => {
      document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== btn.dataset.tab);
    });
    if (btn.dataset.tab === 'jobs') loadJobs();
  });

  renderProfileForm(profile);
  renderNewJobForm();
  loadJobs();

  async function loadJobs() {
    const panel = document.getElementById('tab-jobs');
    panel.innerHTML = '<p class="dim">جارٍ التحميل...</p>';
    try {
      const jobs = await api.myJobs();
      if (jobs.length === 0) {
        panel.innerHTML = '<p class="dim">لا توجد إعلانات بعد.</p>';
        return;
      }
      const statusLabel = { open: ['ساري', 'sage'], filled: ['تم تشغيل موظف', 'brass'], closed: ['متوقف', 'rust'] };
      panel.innerHTML = jobs.map((job) => {
        const [label, color] = statusLabel[job.status];
        return `
        <div class="card mb-3" data-job-card="${job.id}">
          <div class="row space-between">
            <div>
              <h4 class="card-title">${job.title}</h4>
              <p class="dim-sm">${job.location_city}، ${job.location_country}</p>
            </div>
            <span class="text-${color} text-sm">● ${label}</span>
          </div>
          <p class="dim-sm mt-2" id="count-${job.id}">جارٍ حساب عدد المطابقين...</p>
          <div class="row gap wrap mt-3 pt-3 border-top">
            <button class="btn-ghost btn-sm view-applicants" data-job="${job.id}">عرض المتقدمين</button>
            ${job.status === 'open' ? `
              <button class="btn-ghost btn-sm border-sage text-sage change-status" data-job="${job.id}" data-status="filled">تم تشغيل موظف</button>
              <button class="btn-ghost btn-sm border-rust text-rust change-status" data-job="${job.id}" data-status="closed">إيقاف الإعلان</button>
            ` : `
              <button class="btn-ghost btn-sm change-status" data-job="${job.id}" data-status="open">إعادة التفعيل</button>
            `}
          </div>
          <div class="applicants-panel hidden mt-3" id="applicants-${job.id}"></div>
        </div>`;
      }).join('');

      // عدد المطابقين لكل إعلان (منفصل حتى لا يبطئ عرض القائمة)
      jobs.forEach(async (job) => {
        try {
          const { count } = await api.getMatchCount(job.id);
          document.getElementById(`count-${job.id}`).textContent = `عدد الموظفين المطابقين حاليًا: ${count}`;
        } catch {
          document.getElementById(`count-${job.id}`).textContent = '';
        }
      });

      panel.querySelectorAll('.change-status').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await api.updateJobStatus(btn.dataset.job, btn.dataset.status);
          loadJobs();
        });
      });

      panel.querySelectorAll('.view-applicants').forEach((btn) => {
        btn.addEventListener('click', () => toggleApplicants(btn.dataset.job));
      });
    } catch (err) {
      panel.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }

  async function toggleApplicants(jobId) {
    const panel = document.getElementById(`applicants-${jobId}`);
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (!isHidden) return;

    panel.innerHTML = '<p class="dim">جارٍ التحميل...</p>';
    try {
      const applicants = await api.getApplicants(jobId);
      if (applicants.length === 0) {
        panel.innerHTML = '<p class="dim">لا يوجد متقدمون بعد.</p>';
        return;
      }
      const statusLabel = { pending: ['بانتظار قرارك', 'brass'], accepted: ['مقبول', 'sage'], rejected: ['مرفوض', 'rust'] };
      panel.innerHTML = applicants.map((a) => {
        const [label, color] = statusLabel[a.status];
        return `
        <div class="card row gap items-center mb-2">
          <img src="${a.photo_url || 'https://placehold.co/48x48/16233A/C9A24B?text=%20'}" class="avatar" alt="" />
          <div class="flex-1">
            <h5 class="card-title-sm">${a.full_name}</h5>
            <p class="dim-sm">${a.job_title} · ${a.location_city} · ${a.years_experience} سنوات خبرة</p>
            ${a.cv_url ? `<a href="${a.cv_url}" target="_blank" class="accent-link text-sm">عرض السيرة الذاتية</a>` : ''}
          </div>
          ${matchGaugeHTML(a.match_score, 48)}
          ${a.status === 'pending' ? `
            <div class="row gap">
              <button class="btn-primary btn-sm decide-btn" data-app="${a.application_id}" data-status="accepted">قبول</button>
              <button class="btn-ghost btn-sm decide-btn" data-app="${a.application_id}" data-status="rejected">رفض</button>
            </div>` : `<span class="text-${color} text-sm">${label}</span>`}
        </div>`;
      }).join('');
      mountMatchGauges(panel);

      panel.querySelectorAll('.decide-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await api.decideApplicant(btn.dataset.app, btn.dataset.status);
          toggleApplicants(jobId); // إغلاق
          toggleApplicants(jobId); // إعادة فتح وتحديث
        });
      });
    } catch (err) {
      panel.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }

  function renderNewJobForm() {
    const panel = document.getElementById('tab-new');
    panel.innerHTML = `
      <form id="job-form" class="card form-col">
        <div><label class="label">المسمى الوظيفي المطلوب</label>
          <input class="field" name="title" required /></div>
        <div class="grid-2">
          <div><label class="label">المدينة</label><input class="field" name="location_city" required /></div>
          <div><label class="label">الدولة</label><input class="field" name="location_country" required /></div>
          <div><label class="label">نوع الدوام</label>
            <select class="field" name="work_type">
              ${WORK_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
            </select></div>
          <div><label class="label">ساعات العمل</label><input class="field" name="work_hours" placeholder="9 ص - 5 م" /></div>
          <div><label class="label">الحد الأدنى لسنوات الخبرة</label>
            <input class="field" type="number" min="0" name="min_years_experience" /></div>
          <div></div>
          <div><label class="label">الراتب (من)</label><input class="field" type="number" name="salary_min" /></div>
          <div><label class="label">الراتب (إلى)</label><input class="field" type="number" name="salary_max" /></div>
        </div>
        <div><label class="label">المهارات المطلوبة (افصل بينها بفاصلة)</label>
          <input class="field" name="required_skills" /></div>
        <div><label class="label">وصف الوظيفة</label>
          <textarea class="field" rows="3" name="description"></textarea></div>
        <div><label class="label">شروط العمل</label>
          <textarea class="field" rows="2" name="conditions"></textarea></div>
        <p id="job-status" class="dim-sm hidden"></p>
        <button type="submit" class="btn-primary mt-2">نشر الإعلان</button>
      </form>`;

    document.getElementById('job-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('job-status');
      status.classList.remove('hidden');
      status.textContent = 'جارٍ النشر...';
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      try {
        const job = await api.createJob(payload);
        status.textContent = `تم نشر الإعلان — تم إشعار ${job.notified_count} موظف مطابق تلقائيًا`;
        e.target.reset();
        document.querySelector('[data-tab="jobs"]').click();
      } catch (err) {
        status.textContent = err.message;
      }
    });
  }

  function renderProfileForm(p) {
    const panel = document.getElementById('tab-profile');
    panel.innerHTML = `
      <form id="company-form" class="card form-col">
        <div class="grid-2">
          <div><label class="label">اسم الشركة</label>
            <input class="field" name="company_name" required value="${p?.company_name || ''}" /></div>
          <div><label class="label">المجال</label>
            <input class="field" name="industry" value="${p?.industry || ''}" /></div>
          <div><label class="label">المدينة</label>
            <input class="field" name="location_city" required value="${p?.location_city || ''}" /></div>
          <div><label class="label">الدولة</label>
            <input class="field" name="location_country" required value="${p?.location_country || ''}" /></div>
        </div>
        <div><label class="label">الموقع الإلكتروني</label>
          <input class="field" name="website" value="${p?.website || ''}" /></div>
        <div><label class="label">نبذة عن الشركة</label>
          <textarea class="field" rows="3" name="description">${p?.description || ''}</textarea></div>
        ${p && !p.is_verified_business ? `
          <p class="notice">حساب الشركة قيد المراجعة من الإدارة للتحقق من السجل التجاري.</p>` : ''}
        <p id="company-status" class="dim-sm hidden"></p>
        <button type="submit" class="btn-primary mt-2">حفظ</button>
      </form>`;

    document.getElementById('company-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('company-status');
      status.classList.remove('hidden');
      status.textContent = 'جارٍ الحفظ...';
      const payload = Object.fromEntries(new FormData(e.target).entries());
      try {
        profile = await api.saveCompanyProfile(payload);
        status.textContent = 'تم حفظ بيانات الشركة';
      } catch (err) {
        status.textContent = err.message;
      }
    });
  }
}
