// موجّه قائم على hash (#/route) - يعمل مباشرة على GitHub Pages بدون احتياج
// لإعادة توجيه من السيرفر (على عكس history API routing).
const router = (() => {
  const routes = {};
  const appEl = () => document.getElementById('app');

  function register(path, handler) {
    routes[path] = handler;
  }

  function currentPath() {
    const hash = window.location.hash.slice(1); // يحذف #
    return hash || '/';
  }

  function currentQuery() {
    const hash = window.location.hash.slice(1);
    const qIndex = hash.indexOf('?');
    return new URLSearchParams(qIndex >= 0 ? hash.slice(qIndex) : '');
  }

  function navigate(path) {
    window.location.hash = path;
  }

  async function resolve() {
    const rawPath = currentPath().split('?')[0]; // نتجاهل الاستعلام هنا، له دالة منفصلة
    const segments = rawPath.split('/').filter(Boolean);
    const base = segments.length > 1 ? `/${segments[0]}` : rawPath;
    const param = segments.length > 1 ? segments[1] : null;

    const handler = routes[base] || routes['/404'];
    appEl().innerHTML = '';
    await handler(appEl(), param);
    window.scrollTo(0, 0);
  }

  function start() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  return { register, navigate, start, currentQuery };
})();

// حارس بسيط: يوجّه لصفحة الدخول إن لم يكن مسجّلاً، أو للوحته الصحيحة إن كان دوره مختلفًا
function requireAuth(role) {
  if (!auth.isLoggedIn()) {
    router.navigate('/login');
    return false;
  }
  if (role && auth.getUser().role !== role) {
    router.navigate(auth.getUser().role === 'employee' ? '/employee' : '/company');
    return false;
  }
  return true;
}
