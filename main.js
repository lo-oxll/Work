// يُشغَّل بعد تحميل كل السكربتات الأخرى (config, api, auth, router, الصفحات)
function withNavbar(handler) {
  return async (container, param) => {
    renderNavbar();
    await handler(container, param);
  };
}

router.register('/', withNavbar(renderHome));
router.register('/login', withNavbar(renderLogin));
router.register('/register', withNavbar(renderRegister));
router.register('/forgot-password', withNavbar(renderForgotPassword));
router.register('/reset-password', withNavbar(renderResetPassword));
router.register('/employee', withNavbar(renderEmployeeDashboard));
router.register('/job', withNavbar((c) => { router.navigate('/employee'); }));
router.register('/company', withNavbar(renderCompanyDashboard));
router.register('/404', withNavbar((c) => { c.innerHTML = '<div class="page-narrow center"><p>الصفحة غير موجودة</p></div>'; }));

router.start();
