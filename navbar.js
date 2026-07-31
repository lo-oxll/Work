function renderNavbar() {
  const nav = document.getElementById('navbar');
  const user = auth.getUser();

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="#/" class="brand">تو<span class="accent">افق</span></a>
      ${user ? `
        <div class="nav-user">
          <span class="nav-email">${user.email} · ${user.role === 'employee' ? 'موظف' : 'شركة'}</span>
          <button id="logout-btn" class="btn-ghost btn-sm">تسجيل الخروج</button>
        </div>
      ` : `
        <div class="nav-actions">
          <a href="#/login" class="btn-ghost btn-sm">دخول</a>
          <a href="#/register" class="btn-primary btn-sm">تسجيل جديد</a>
        </div>
      `}
    </div>`;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    auth.logout();
    router.navigate('/login');
  });
}
