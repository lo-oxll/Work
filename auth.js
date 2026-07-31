// إدارة بسيطة لحالة المصادقة، محفوظة في sessionStorage
const auth = (() => {
  function getRaw() {
    const raw = sessionStorage.getItem('auth');
    return raw ? JSON.parse(raw) : null;
  }
  return {
    getToken: () => getRaw()?.token || null,
    getUser: () => getRaw()?.user || null,
    isLoggedIn: () => !!getRaw(),
    login(token, user) {
      sessionStorage.setItem('auth', JSON.stringify({ token, user }));
    },
    logout() {
      sessionStorage.removeItem('auth');
    },
  };
})();
