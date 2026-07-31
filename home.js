function renderHome(container) {
  if (auth.isLoggedIn()) {
    router.navigate(auth.getUser().role === 'employee' ? '/employee' : '/company');
    return;
  }
  container.innerHTML = `
    <div class="page-narrow center">
      <h1 class="hero-title">نقطة اللقاء بين <span class="accent">الكفاءة</span> والفرصة</h1>
      <p class="hero-sub">سجّل كموظف يبحث عن عمل أو كشركة تبحث عن الموظف المناسب. عند نشر إعلان، يُشعَر المطابقون فقط تلقائيًا.</p>
      <div class="row gap center">
        <a href="#/register" class="btn-primary">ابدأ الآن</a>
        <a href="#/login" class="btn-ghost">لدي حساب</a>
      </div>
    </div>`;
}
