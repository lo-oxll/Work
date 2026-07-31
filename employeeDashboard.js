const WORK_TYPES = [
  ['full_time', 'دوام كامل'], ['part_time', 'دوام جزئي'], ['remote', 'عن بُعد'],
  ['contract', 'عقد'], ['freelance', 'حر'],
];
const workTypeLabel = (v) => (WORK_TYPES.find((w) => w[0] === v) || [, v])[1];

async function renderEmployeeDashboard(container) {
  if (!requireAuth('employee')) return;

  let profile = null;
  try { profile = await api.getMyEmployeeProfile(); } catch { /* لا يوجد بروفايل بعد */ }

  container.innerHTML = `
    <div class="page-wide">
      <div class="row space-between mb-6">
        <h1 class="page-title !mb-0">لوحة الموظف</h1>
        <div class="row gap">
          ${profile ? `<button id="avail-btn" class="pill ${profile.is_available ? 'pill-ok' : 'pill-bad'}">
            ● ${profile.is_available ? 'متاح للعمل' : 'غير متاح حاليًا'}</button>` : ''}
          <button id="notif-btn" class="btn-ghost btn-sm">تفعيل الإشعارات</button>
        </div>
      </div>

      <div class="tabs" id="tabs">
        <button class="tab active" data-tab="profile">بياناتي</button>
        <button class="tab" data-tab="jobs">الوظائف المتاحة لي</button>
        <button class="tab" data-tab="applications">طلباتي</button>
      </div>

      <div id="tab-profile" class="tab-panel"></div>
      <div id="tab-jobs" class="tab-panel hidden"></div>
      <div id="tab-applications" class="tab-panel hidden"></div>
    </div>`;

  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    ['profile', 'jobs', 'applications'].forEach((t) => {
      document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== btn.dataset.tab);
    });
    if (btn.dataset.tab === 'jobs') loadMatchedJobs();
    if (btn.dataset.tab === 'applications') loadMyApplications();
  });

  document.getElementById('avail-btn')?.addEventListener('click', async (e) => {
    const next = !profile.is_available;
    profile = await api.setAvailability(next);
    e.target.textContent = `● ${profile.is_available ? 'متاح للعمل' : 'غير متاح حاليًا'}`;
    e.target.classList.toggle('pill-ok', profile.is_available);
    e.target.classList.toggle('pill-bad', !profile.is_available);
  });

  document.getElementById('notif-btn').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'جارٍ التفعيل...';
    try {
      await pushNotifications.enable();
      e.target.textContent = '✓ الإشعارات مفعّلة';
    } catch (err) {
      alert(err.message);
      e.target.disabled = false;
      e.target.textContent = 'تفعيل الإشعارات';
    }
  });

  renderProfileForm(profile);

  async function loadMatchedJobs() {
    const panel = document.getElementById('tab-jobs');
    panel.innerHTML = '<p class="dim">جارٍ التحميل...</p>';
    try {
      const jobs = await api.matchedForMe();
      if (jobs.length === 0) {
        panel.innerHTML = '<p class="dim">لا توجد وظائف مطابقة حاليًا. فعّل "متاح للعمل" ليصلك المزيد.</p>';
        return;
      }
      panel.innerHTML = jobs.map((m) => `
        <div class="card row gap items-center mb-3">
          <div class="flex-1">
            <h4 class="card-title">${m.job.title}</h4>
            <p class="dim-sm">${m.job.company_name} · ${m.job.location_city} · ${workTypeLabel(m.job.work_type)}</p>
          </div>
          ${matchGaugeHTML(m.total, 52)}
          <button class="btn-primary btn-sm apply-btn" data-job="${m.job.id}" ${m.already_applied ? 'disabled' : ''}>
            ${m.already_applied ? 'تم التقديم' : 'تقديم'}
          </button>
        </div>`).join('');
      mountMatchGauges(panel);

      panel.querySelectorAll('.apply-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = 'جارٍ التقديم...';
          try {
            await api.applyToJob(btn.dataset.job);
            btn.textContent = 'تم التقديم';
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = 'تقديم';
          }
        });
      });
    } catch (err) {
      panel.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }

  async function loadMyApplications() {
    const panel = document.getElementById('tab-applications');
    panel.innerHTML = '<p class="dim">جارٍ التحميل...</p>';
    try {
      const apps = await api.myApplications();
      if (apps.length === 0) {
        panel.innerHTML = '<p class="dim">لم تتقدّم على أي وظيفة بعد.</p>';
        return;
      }
      const statusLabel = { pending: ['بانتظار رد الشركة', 'brass'], accepted: ['مقبول', 'sage'], rejected: ['مرفوض', 'rust'] };
      panel.innerHTML = apps.map((a) => {
        const [label, color] = statusLabel[a.status];
        return `
          <div class="card mb-3">
            <h4 class="card-title">${a.title}</h4>
            <p class="dim-sm">${a.company_name} · ${a.location_city}</p>
            <p class="text-${color} text-sm mt-1">الحالة: ${label}</p>
          </div>`;
      }).join('');
    } catch (err) {
      panel.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }

  function renderProfileForm(p) {
    const panel = document.getElementById('tab-profile');
    panel.innerHTML = `
      <form id="profile-form" class="card form-col">
        <div class="grid-2">
          <div><label class="label">الاسم الكامل</label>
            <input class="field" name="full_name" required value="${p?.full_name || ''}" /></div>
          <div><label class="label">المسمى الوظيفي</label>
            <input class="field" name="job_title" required value="${p?.job_title || ''}" /></div>
          <div><label class="label">المدينة</label>
            <input class="field" name="location_city" required value="${p?.location_city || ''}" /></div>
          <div><label class="label">الدولة</label>
            <input class="field" name="location_country" required value="${p?.location_country || ''}" /></div>
          <div><label class="label">سنوات الخبرة</label>
            <input class="field" type="number" min="0" name="years_experience" required value="${p?.years_experience ?? ''}" /></div>
          <div><label class="label">نوع الدوام المفضل</label>
            <select class="field" name="preferred_work_type">
              <option value="">— بدون تفضيل —</option>
              ${WORK_TYPES.map(([v, l]) => `<option value="${v}" ${p?.preferred_work_type === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select></div>
          <div><label class="label">الراتب المتوقع (من)</label>
            <input class="field" type="number" name="expected_salary_min" value="${p?.expected_salary_min ?? ''}" /></div>
          <div><label class="label">الراتب المتوقع (إلى)</label>
            <input class="field" type="number" name="expected_salary_max" value="${p?.expected_salary_max ?? ''}" /></div>
        </div>
        <div><label class="label">المهارات (افصل بينها بفاصلة)</label>
          <input class="field" name="skills" value="${(p?.skills || []).join(', ')}" /></div>
        <div><label class="label">نبذة مختصرة</label>
          <textarea class="field" rows="3" name="bio">${p?.bio || ''}</textarea></div>
        <div class="grid-2">
          <div><label class="label">الصورة الشخصية (JPEG/PNG، حتى 5MB)</label>
            <input class="field" type="file" name="photo" accept="image/jpeg,image/png" />
            <p id="photo-error" class="error-text hidden"></p></div>
          <div><label class="label">السيرة الذاتية (PDF فقط، حتى 5MB)</label>
            <input class="field" type="file" name="cv" accept="application/pdf" />
            <p id="cv-error" class="error-text hidden"></p></div>
        </div>
        <p id="profile-status" class="dim-sm hidden"></p>
        <button type="submit" class="btn-primary mt-2">حفظ البيانات</button>
      </form>`;

    const MAX_SIZE = 5 * 1024 * 1024;
    const form = document.getElementById('profile-form');

    form.photo.addEventListener('change', () => {
      const f = form.photo.files[0];
      const err = document.getElementById('photo-error');
      if (f && !['image/jpeg', 'image/png'].includes(f.type)) {
        err.textContent = 'الصورة يجب أن تكون JPEG أو PNG فقط'; err.classList.remove('hidden'); form.photo.value = '';
      } else if (f && f.size > MAX_SIZE) {
        err.textContent = 'حجم الصورة أكبر من 5 ميجابايت'; err.classList.remove('hidden'); form.photo.value = '';
      } else { err.classList.add('hidden'); }
    });

    form.cv.addEventListener('change', () => {
      const f = form.cv.files[0];
      const err = document.getElementById('cv-error');
      if (f && f.type !== 'application/pdf') {
        err.textContent = 'السيرة الذاتية يجب أن تكون PDF فقط'; err.classList.remove('hidden'); form.cv.value = '';
      } else if (f && f.size > MAX_SIZE) {
        err.textContent = 'حجم الملف أكبر من 5 ميجابايت'; err.classList.remove('hidden'); form.cv.value = '';
      } else { err.classList.add('hidden'); }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('profile-status');
      status.classList.remove('hidden');
      status.textContent = 'جارٍ الحفظ...';
      const fd = new FormData(form);
      try {
        profile = await api.saveEmployeeProfile(fd);
        status.textContent = 'تم الحفظ بنجاح';
      } catch (err) {
        status.textContent = err.message;
      }
    });
  }
}
