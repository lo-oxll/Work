function renderLogin(container) {
  container.innerHTML = `
    <div class="page-narrow">
      <h1 class="page-title">تسجيل الدخول</h1>
      <p class="page-sub">أدخل بياناتك للوصول إلى حسابك</p>

      <form id="login-form" class="form-col">
        <div>
          <label class="label">البريد الإلكتروني</label>
          <input type="email" name="email" required class="field" />
        </div>
        <div>
          <label class="label">كلمة المرور</label>
          <input type="password" name="password" required class="field" />
        </div>
        <p id="login-error" class="error-text hidden"></p>
        <button type="submit" class="btn-primary mt-2">دخول</button>
      </form>

      <p class="mt-4"><a href="#/forgot-password" class="muted-link">نسيت كلمة المرور؟</a></p>
      <p class="mt-2 dim">لا تملك حسابًا؟ <a href="#/register" class="accent-link">سجّل الآن</a></p>
    </div>`;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');
    const form = new FormData(e.target);
    const payload = { email: form.get('email'), password: form.get('password') };

    try {
      const data = await api.login(payload);
      auth.login(data.token, data.user);
      router.navigate(data.user.role === 'employee' ? '/employee' : '/company');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
