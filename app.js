// ============================================================
// إعدادات الاتصال بـ Supabase — عدّل هذه القيم بمشروعك الخاص
// ============================================================
const SUPABASE_URL = 'https://lqfyilxpibzwosxxrfxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i0AKXxvK3mPOGHyAN33OOw_6hQ_2P-6';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null; // { role, full_name, phone, ... }

// ------------------ تنقّل بين الواجهات ------------------
function showNav(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('#mainNav button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + name);
  if (btn) btn.classList.add('active');
}

function renderNav(){
  const nav = document.getElementById('mainNav');
  nav.innerHTML = '';
  if (!currentUser){
    nav.innerHTML = `
      <button id="nav-login" onclick="showNav('login')">دخول</button>
      <button id="nav-register" onclick="showNav('register')">تسجيل جديد</button>`;
    showNav('login');
    return;
  }
  const roleView = currentProfile.role === 'company' ? 'company' : 'employee';
  nav.innerHTML = `
    <button id="nav-${roleView}" onclick="showNav('${roleView}')">لوحتي</button>
    <button onclick="handleLogout()">خروج</button>`;
  showNav(roleView);
}

function alertMsg(text, type='ok'){
  const box = document.getElementById('alertBox');
  box.innerHTML = `<div class="msg ${type}">${text}</div>`;
  setTimeout(() => box.innerHTML = '', 5000);
}

// ------------------ تسجيل ------------------
async function handleRegister(){
  if (document.getElementById('regWebsite').value){
    // امتلأ الحقل المخفي = بوت
    return;
  }
  const role = document.getElementById('regRole').value;
  const full_name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const phone = document.getElementById('regPhone').value.trim();

  if (!full_name || !email || !password || !phone){
    return alertMsg('الرجاء تعبئة كل الحقول', 'error');
  }

  // تأكد عدم وجود جلسة سابقة عالقة (مثلاً حساب موظف مسجّل دخول) قبل تسجيل حساب جديد
  await sb.auth.signOut();

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return alertMsg(error.message, 'error');

  const uid = data.user.id;
  const { error: profileErr } = await sb.from('profiles').insert({
    id: uid, role, full_name, phone
  });
  if (profileErr) return alertMsg(profileErr.message, 'error');

  if (role === 'employee'){
    await sb.from('employee_profiles').insert({ id: uid, job_title: '', city: '', employment_type: 'دوام_كامل' });
  } else {
    await sb.from('company_profiles').insert({ id: uid, company_name: full_name, city: '' });
  }

  alertMsg('تم إنشاء الحساب. الرجاء فتح بريدك الإلكتروني لتفعيل الحساب قبل الدخول.', 'ok');
  showNav('login');
}

// ------------------ دخول ------------------
async function handleLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return alertMsg('فشل تسجيل الدخول: ' + error.message, 'error');
  await loadCurrentUser();
}

async function handleForgotPassword(){
  const email = prompt('أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور:');
  if (!email) return;
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) return alertMsg(error.message, 'error');
  alertMsg('تم إرسال رابط إعادة التعيين إلى بريدك.', 'ok');
}

async function handleLogout(){
  await sb.auth.signOut();
  currentUser = null; currentProfile = null;
  renderNav();
}

async function loadCurrentUser(){
  const { data: { user } } = await sb.auth.getUser();
  if (!user){ renderNav(); return; }
  currentUser = user;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  currentProfile = profile;
  renderNav();
  if (profile.role === 'employee') loadEmployeeView();
  if (profile.role === 'company') loadCompanyView();
}

// ------------------ بروفايل الموظف ------------------
async function loadEmployeeView(){
  const { data: emp } = await sb.from('employee_profiles').select('*').eq('id', currentUser.id).single();
  if (emp){
    document.getElementById('empTitle').value = emp.job_title || '';
    document.getElementById('empCity').value = emp.city || '';
    document.getElementById('empYears').value = emp.years_experience || 0;
    document.getElementById('empType').value = emp.employment_type || 'دوام_كامل';
    document.getElementById('empSalMin').value = emp.expected_salary_min || '';
    document.getElementById('empSalMax').value = emp.expected_salary_max || '';
    updateAvailPill(emp.is_available);
  }
  await loadEmployeeOffers();
}

function updateAvailPill(isAvailable){
  const pill = document.getElementById('empAvailPill');
  pill.textContent = isAvailable ? 'متاح للعمل' : 'غير متاح';
  pill.className = 'pill ' + (isAvailable ? 'available' : 'unavailable');
}

async function saveEmployeeProfile(){
  const photoFile = document.getElementById('empPhoto').files[0];
  const cvFile = document.getElementById('empCv').files[0];
  let photo_url, cv_url;

  if (photoFile){
    const path = `${currentUser.id}/${Date.now()}_${photoFile.name}`;
    const { error } = await sb.storage.from('avatars').upload(path, photoFile, { upsert: true });
    if (!error) photo_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }
  if (cvFile){
    const path = `${currentUser.id}/${Date.now()}_${cvFile.name}`;
    const { error } = await sb.storage.from('cvs').upload(path, cvFile, { upsert: true });
    if (!error) cv_url = sb.storage.from('cvs').getPublicUrl(path).data.publicUrl;
  }

  const update = {
    job_title: document.getElementById('empTitle').value.trim(),
    city: document.getElementById('empCity').value.trim(),
    years_experience: Number(document.getElementById('empYears').value) || 0,
    employment_type: document.getElementById('empType').value,
    expected_salary_min: Number(document.getElementById('empSalMin').value) || null,
    expected_salary_max: Number(document.getElementById('empSalMax').value) || null,
    updated_at: new Date().toISOString()
  };
  if (photo_url) update.photo_url = photo_url;
  if (cv_url) update.cv_url = cv_url;

  const { error } = await sb.from('employee_profiles').update(update).eq('id', currentUser.id);
  if (error) return alertMsg(error.message, 'error');
  alertMsg('تم حفظ البروفايل بنجاح', 'ok');
}

async function toggleAvailability(){
  const { data: emp } = await sb.from('employee_profiles').select('is_available').eq('id', currentUser.id).single();
  const newVal = !emp.is_available;
  await sb.from('employee_profiles').update({ is_available: newVal }).eq('id', currentUser.id);
  updateAvailPill(newVal);
}

async function loadEmployeeOffers(){
  const { data: offers } = await sb.from('applications')
    .select('id, status, match_score, job_postings(job_title, city, company_profiles(company_name))')
    .eq('employee_id', currentUser.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('employeeOffers');
  if (!offers || offers.length === 0){
    container.innerHTML = '<p class="center">لا توجد عروض بعد</p>';
    return;
  }
  container.innerHTML = offers.map(o => `
    <div class="job-row">
      <div class="job-row-top">
        <div>
          <strong>${o.job_postings?.company_profiles?.company_name || 'شركة'}</strong>
          — ${o.job_postings?.job_title || ''} (${o.job_postings?.city || ''})
          <div class="mono" style="font-size:12px; color:var(--text-dim);">درجة التوافق: ${o.match_score}%</div>
        </div>
        <div>
          ${o.status === 'sent' ? `
            <button class="btn" style="padding:6px 14px;" onclick="respondOffer('${o.id}','accepted')">قبول</button>
            <button class="btn danger" style="padding:6px 14px;" onclick="respondOffer('${o.id}','rejected')">رفض</button>
          ` : `<span class="pill ${o.status === 'accepted' ? 'available' : 'unavailable'}">${o.status === 'accepted' ? 'مقبول' : 'مرفوض'}</span>`}
        </div>
      </div>
    </div>`).join('');
}

async function respondOffer(appId, status){
  const { error } = await sb.from('applications')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', appId);
  if (error) return alertMsg(error.message, 'error');
  await loadEmployeeOffers();
}

// ------------------ بروفايل الشركة ------------------
async function loadCompanyView(){
  const { data: comp } = await sb.from('company_profiles').select('*').eq('id', currentUser.id).single();
  if (comp){
    document.getElementById('compName').value = comp.company_name || '';
    document.getElementById('compCity').value = comp.city || '';
    document.getElementById('compField').value = comp.business_field || '';
    document.getElementById('compRegistry').value = comp.commercial_registry_no || '';
    document.getElementById('compVerifiedPill').innerHTML = comp.is_verified_business
      ? '<span class="pill available">شركة موثّقة</span>'
      : '<span class="pill unavailable">قيد التوثيق</span>';
  }
  await loadCompanyJobs();
}

async function saveCompanyProfile(){
  const update = {
    company_name: document.getElementById('compName').value.trim(),
    city: document.getElementById('compCity').value.trim(),
    business_field: document.getElementById('compField').value.trim(),
    commercial_registry_no: document.getElementById('compRegistry').value.trim(),
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('company_profiles').update(update).eq('id', currentUser.id);
  if (error) return alertMsg(error.message, 'error');
  alertMsg('تم حفظ بيانات الشركة', 'ok');
}

async function createJob(){
  const job = {
    company_id: currentUser.id,
    job_title: document.getElementById('jobTitle').value.trim(),
    city: document.getElementById('jobCity').value.trim(),
    min_experience: Number(document.getElementById('jobMinExp').value) || 0,
    employment_type: document.getElementById('jobType').value,
    budget_min: Number(document.getElementById('jobBudMin').value) || null,
    budget_max: Number(document.getElementById('jobBudMax').value) || null,
    work_conditions: document.getElementById('jobConditions').value.trim()
  };
  if (!job.job_title || !job.city) return alertMsg('املأ المسمى الوظيفي والمدينة على الأقل', 'error');

  const { error } = await sb.from('job_postings').insert(job);
  if (error) return alertMsg(error.message, 'error');
  alertMsg('تم نشر الإعلان', 'ok');
  ['jobTitle','jobCity','jobMinExp','jobBudMin','jobBudMax','jobConditions'].forEach(id => document.getElementById(id).value = '');
  await loadCompanyJobs();
}

async function loadCompanyJobs(){
  const { data: jobs } = await sb.from('job_postings')
    .select('*').eq('company_id', currentUser.id).order('created_at', { ascending: false });

  const container = document.getElementById('companyJobs');
  if (!jobs || jobs.length === 0){
    container.innerHTML = '<p class="center">لا توجد إعلانات بعد</p>';
    return;
  }
  container.innerHTML = jobs.map(j => `
    <div class="job-row">
      <div class="job-row-top">
        <div>
          <strong>${j.job_title}</strong> — ${j.city}
          <div class="mono" style="font-size:12px; color:var(--text-dim);">خبرة ≥ ${j.min_experience} سنة</div>
        </div>
        <div>
          <span class="pill ${j.status}">${j.status === 'open' ? 'ساري' : j.status === 'filled' ? 'تم تشغيل موظف' : 'متوقف'}</span>
        </div>
      </div>
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn secondary" style="padding:6px 14px;" onclick="viewMatches('${j.id}')">عرض المطابقات</button>
        ${j.status === 'open' ? `<button class="btn" style="padding:6px 14px;" onclick="requestEmployees('${j.id}')">طلب موظف</button>` : ''}
        ${j.status !== 'filled' ? `<button class="btn secondary" style="padding:6px 14px;" onclick="updateJobStatus('${j.id}','filled')">تم تشغيل موظف</button>` : ''}
        ${j.status !== 'closed' ? `<button class="btn danger" style="padding:6px 14px;" onclick="updateJobStatus('${j.id}','closed')">إيقاف الإعلان</button>` : ''}
      </div>
      <div id="matches-${j.id}"></div>
    </div>`).join('');
}

async function updateJobStatus(jobId, status){
  await sb.from('job_postings').update({ status }).eq('id', jobId);
  await loadCompanyJobs();
}

function scoreColor(score){
  if (score >= 70) return 'var(--sage)';
  if (score >= 40) return 'var(--brass)';
  return 'var(--rust)';
}

async function viewMatches(jobId){
  const { data: matches, error } = await sb.rpc('matches_for_job', { p_job_id: jobId, p_min_score: 40 });
  const target = document.getElementById(`matches-${jobId}`);
  if (error){ target.innerHTML = `<div class="msg error">${error.message}</div>`; return; }
  if (!matches || matches.length === 0){
    target.innerHTML = '<p class="center">لا يوجد موظفون مطابقون حاليًا</p>';
    return;
  }
  target.innerHTML = matches.map(m => `
    <div class="match-row">
      <div class="match-gauge" style="--pct:${m.score}; --color:${scoreColor(m.score)};"><span class="mono">${m.score}%</span></div>
      <div class="match-info">
        <div class="name">${m.full_name}</div>
        <div class="meta">${m.job_title} · ${m.city} · ${m.years_experience} سنوات خبرة</div>
      </div>
    </div>`).join('');
}

async function requestEmployees(jobId){
  const { data: matches, error } = await sb.rpc('matches_for_job', { p_job_id: jobId, p_min_score: 40 });
  if (error) return alertMsg(error.message, 'error');
  if (!matches || matches.length === 0) return alertMsg('لا يوجد موظفون مطابقون لإرسال طلب لهم', 'error');

  const { data: job } = await sb.from('job_postings').select('*').eq('id', jobId).single();
  const { data: comp } = await sb.from('company_profiles').select('company_name').eq('id', currentUser.id).single();

  // تسجيل الطلبات في applications (upsert لتفادي التكرار)
  const rows = matches.map(m => ({ job_id: jobId, employee_id: m.employee_id, match_score: m.score }));
  await sb.from('applications').upsert(rows, { onConflict: 'job_id,employee_id', ignoreDuplicates: true });

  // فتح روابط واتساب — الموظف الأول أولًا، والباقي كقائمة نسخ يدوية
  const links = matches.map(m => {
    const text = encodeURIComponent(
      `مرحبًا ${m.full_name}، شركة ${comp?.company_name || ''} تبحث عن ${job.job_title} في ${job.city}. هل أنت مهتم؟`
    );
    return `https://wa.me/${m.phone.replace(/[^0-9]/g,'')}?text=${text}`;
  });

  window.open(links[0], '_blank');
  if (links.length > 1){
    alertMsg(`تم فتح واتساب لأول موظف مطابق (${matches[0].full_name}). يوجد ${links.length - 1} موظف/موظفين إضافيين مطابقين — راجع قائمة المطابقات لفتح رابط كل واحد يدويًا.`, 'ok');
  }
}

// ------------------ بدء التشغيل ------------------
sb.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') loadCurrentUser();
});
renderNav();
