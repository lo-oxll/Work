function renderResetPassword(container) {
  const token = router.currentQuery().get('token') || '';

  container.innerHTML = `
    <div class="page-narrow">
      <h1 class="page-title">تعيين كلمة مرور جديدة</h1>
      <p class="page-sub">اختر كلمة مرور جديدة لحسابك</p>

      <form id="reset-form" class="form-col">
        <div>
          <label class="label">كلمة المرور الجديدة</label>
          <input type="password" name="password" required minlength="8" class="field" />
        </div>
        <div>
          <label class="label">تأكيد كلمة المرور</label>
          <input type="password" name="confirm" required minlength="8" class="field" />
        </div>
        <p id="reset-error" class="error-text hidden"></p>
        <p id="reset-success" class="success-text hidden"></p>
        <button type="submit" class="btn-primary mt-2">حفظ كلمة المرور</button>
      </form>

      <p class="mt-4 dim"><a href="#/login" class="accent-link">العودة لتسجيل الدخول</a></p>
    </div>`;

  document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('reset-error');
    const successEl = document.getElementById('reset-success');
    errorEl.classList.add('hidden');

    const form = new FormData(e.target);
    const password = form.get('password');
    const confirm = form.get('confirm');

    if (!token) {
      errorEl.textContent = 'رابط إعادة التعيين غير صالح — افتح الرابط الكامل من الإيميل';
      errorEl.classList.remove('hidden');
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = 'كلمتا المرور غير متطابقتين';
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      const data = await api.resetPassword(token, password);
      successEl.textContent = data.message;
      successEl.classList.remove('hidden');
      setTimeout(() => router.navigate('/login'), 2000);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
