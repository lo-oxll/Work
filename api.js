// عميل موحّد للتواصل مع الـ backend. يعتمد على window.API_BASE_URL من config.js
const api = (() => {
  async function request(path, { method = 'GET', body, isForm = false } = {}) {
    const token = auth.getToken();
    const headers = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${window.API_BASE_URL}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.errors?.[0]?.msg || 'حدث خطأ غير متوقع');
    }
    return data;
  }

  return {
    // مصادقة
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token, newPassword) =>
      request('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),

    // موظف
    getMyEmployeeProfile: () => request('/employee/profile/me'),
    saveEmployeeProfile: (formData) => request('/employee/profile', { method: 'PUT', body: formData, isForm: true }),
    setAvailability: (isAvailable) =>
      request('/employee/availability', { method: 'PATCH', body: { is_available: isAvailable } }),
    getVapidPublicKey: () => request('/employee/push/vapid-public-key'),
    subscribePush: (subscription) => request('/employee/push/subscribe', { method: 'POST', body: subscription }),
    unsubscribePush: (endpoint) => request('/employee/push/subscribe', { method: 'DELETE', body: { endpoint } }),

    // شركة
    getMyCompanyProfile: () => request('/company/profile/me'),
    saveCompanyProfile: (payload) => request('/company/profile', { method: 'PUT', body: payload }),

    // إعلانات
    myJobs: () => request('/jobs/mine'),
    createJob: (payload) => request('/jobs', { method: 'POST', body: payload }),
    updateJobStatus: (id, status) => request(`/jobs/${id}/status`, { method: 'PATCH', body: { status } }),
    getMatchCount: (id) => request(`/jobs/${id}/match-count`),
    getApplicants: (id) => request(`/jobs/${id}/applicants`),
    decideApplicant: (applicationId, status) =>
      request(`/jobs/applications/${applicationId}/decision`, { method: 'PATCH', body: { status } }),

    // موظف يتقدّم
    matchedForMe: () => request('/jobs/matched-for-me'),
    applyToJob: (jobId) => request(`/jobs/${jobId}/apply`, { method: 'POST' }),
    myApplications: () => request('/jobs/my-applications'),
  };
})();
