function renderRegister(container) {
  let role = 'employee';

  container.innerHTML = `
    <div class="page-narrow">
      <h1 class="page-title">إنشاء حساب</h1>
      <p class="page-sub">اختر نوع الحساب وأدخل بياناتك</p>

      <div class="role-toggle" id="role-toggle">
        <button type="button" class="role-btn active" data-role="employee">موظف يبحث عن عمل</button>
        <button type="button" class="role-btn" data-role="company">شركة تبحث عن موظفين</button>
      </div>

      <form id="register-form" class="form-col">
        <div>
          <label class="label">البريد الإلكتروني</label>
          <input type="email" name="email" required class="field" />
        </div>
        <div>
          <label class="label">رقم الواتساب (بصيغة دولية)</label>
          <input type="tel" name="phone" required placeholder="9665xxxxxxxx" class="field" />
        </div>
        <div>
          <label class="label">كلمة المرور</label>
          <input type="password" name="password" required minlength="8" class="field" />
        </div>
        <!-- حقل honeypot مخفي لصيد البوتات -->
        <input type="text" name="website_hp" tabindex="-1" autocomplete="off" class="honeypot" />

        <p id="register-error" class="error-text hidden"></p>
        <p id="register-success" class="success-text hidden"></p>
        <button type="submit" class="btn-primary mt-2">إنشاء الحساب</button>
      </form>

      <p class="mt-4 dim">لديك حساب؟ <a href="#/login" class="accent-link">سجّل الدخول</a></p>
    </div>`;

  document.getElementById('role-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.role-btn');
    if (!btn) return;
    role = btn.dataset.role;
    document.querySelectorAll('.role-btn').forEach((b) => b.classList.toggle('active', b === btn));
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    const form = new FormData(e.target);
    const payload = {
      email: form.get('email'),
      phone: form.get('phone'),
      password: form.get('password'),
      website_hp: form.get('website_hp'),
      role,
    };

    try {
      await api.register(payload);
      successEl.textContent = 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيله قبل الدخول.';
      successEl.classList.remove('hidden');
      setTimeout(() => router.navigate('/login'), 2500);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
