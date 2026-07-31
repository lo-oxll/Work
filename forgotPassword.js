function renderForgotPassword(container) {
  container.innerHTML = `
    <div class="page-narrow">
      <h1 class="page-title">استعادة كلمة المرور</h1>
      <p class="page-sub">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

      <form id="forgot-form" class="form-col">
        <div>
          <label class="label">البريد الإلكتروني</label>
          <input type="email" name="email" required class="field" />
        </div>
        <p id="forgot-error" class="error-text hidden"></p>
        <p id="forgot-success" class="success-text hidden"></p>
        <button type="submit" class="btn-primary mt-2">إرسال رابط الاستعادة</button>
      </form>

      <p class="mt-4 dim"><a href="#/login" class="accent-link">العودة لتسجيل الدخول</a></p>
    </div>`;

  document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('forgot-error');
    const successEl = document.getElementById('forgot-success');
    errorEl.classList.add('hidden');

    const email = new FormData(e.target).get('email');
    try {
      const data = await api.forgotPassword(email);
      successEl.textContent = data.message;
      successEl.classList.remove('hidden');
      e.target.querySelector('button').disabled = true;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
