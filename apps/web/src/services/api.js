import axios from 'axios';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization Bearer token if present in localStorage
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized responses
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401 && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username, password) => {
    const res = await apiClient.post('/auth/login', { username, password });
    if (res.data.token) {
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(res.data.admin));
    }
    return res.data;
  },
  getCurrentAdmin: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
  resetPassword: async (username, recoveryKey, newPassword) => {
    const res = await apiClient.post('/auth/reset-password', { username, recoveryKey, newPassword });
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },
  getStoredUser: () => {
    try {
      const data = localStorage.getItem('admin_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
};

// Device API
export const deviceApi = {
  getStatus: async () => {
    const res = await apiClient.get('/device/status');
    return res.data;
  },
  reconnect: async () => {
    const res = await apiClient.post('/device/reconnect');
    return res.data;
  },
  testDevice: async () => {
    const res = await apiClient.post('/device/test');
    return res.data;
  },
  capture: async () => {
    const res = await apiClient.post('/device/capture');
    return res.data;
  },
  identify: async (templateData) => {
    const res = await apiClient.post('/device/identify', { templateData });
    return res.data;
  },
  setSimulator: async (ready, busy) => {
    const res = await apiClient.post('/device/simulator-toggle', { ready, busy });
    return res.data;
  }
};

// Attendance API
export const attendanceApi = {
  punch: async (payload) => {
    const res = await apiClient.post('/attendance/punch', payload);
    return res.data;
  },
  getToday: async (filters = {}) => {
    const res = await apiClient.get('/attendance/today', { params: filters });
    return res.data;
  },
  getAttendance: async (filters = {}) => {
    const res = await apiClient.get('/attendance', { params: filters });
    return res.data;
  },
  getStaffAttendance: async (staffId, filters = {}) => {
    const res = await apiClient.get(`/attendance/${staffId}`, { params: filters });
    return res.data;
  },
  getPunches: async (filters = {}) => {
    const res = await apiClient.get('/punches', { params: filters });
    return res.data;
  },
  setOverride: async (overrideData) => {
    const res = await apiClient.post('/attendance/override', overrideData);
    return res.data;
  },
  getOverrides: async () => {
    const res = await apiClient.get('/attendance/overrides');
    return res.data;
  }
};

// Staff API
export const staffApi = {
  getAll: async (filters = {}) => {
    const res = await apiClient.get('/staff', { params: filters });
    return res.data;
  },
  getById: async (id) => {
    const res = await apiClient.get(`/staff/${id}`);
    return res.data;
  },
  create: async (staffData) => {
    const res = await apiClient.post('/staff', staffData);
    return res.data;
  },
  update: async (id, staffData) => {
    const res = await apiClient.put(`/staff/${id}`, staffData);
    return res.data;
  },
  delete: async (id) => {
    const res = await apiClient.delete(`/staff/${id}`);
    return res.data;
  },
  enrollFingerprint: async (staffId, fingerData) => {
    const res = await apiClient.post(`/staff/${staffId}/fingerprint`, fingerData);
    return res.data;
  },
  removeFingerprint: async (staffId, fingerIndex) => {
    const res = await apiClient.delete(`/staff/${staffId}/fingerprint/${fingerIndex}`);
    return res.data;
  }
};

// Rules API
export const rulesApi = {
  getRules: async () => {
    const res = await apiClient.get('/rules');
    return res.data;
  },
  updateRules: async (rulesData) => {
    const res = await apiClient.put('/rules', rulesData);
    return res.data;
  }
};

// Reports API
export const reportsApi = {
  getReportData: async (filters = {}) => {
    const res = await apiClient.get('/reports/attendance', { params: filters });
    return res.data;
  },
  getPdfDownloadUrl: (filters = {}) => {
    const token = localStorage.getItem('admin_token') || '';
    const params = new URLSearchParams({ ...filters, token }).toString();
    return `${API_BASE}/reports/attendance.pdf?${params}`;
  },
  downloadPdf: async (filters = {}) => {
    const res = await apiClient.get('/reports/attendance.pdf', {
      params: filters,
      responseType: 'blob'
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-report-${filters.fromDate || new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

// Backup API
export const backupApi = {
  create: async () => {
    const res = await apiClient.post('/backup/create');
    return res.data;
  },
  list: async () => {
    const res = await apiClient.get('/backup/list');
    return res.data;
  },
  getDownloadUrl: (filename) => {
    return `${API_BASE}/backup/${encodeURIComponent(filename)}/download`;
  },
  validate: async (payload) => {
    const res = await apiClient.post('/backup/validate', payload);
    return res.data;
  },
  restore: async (payload) => {
    const res = await apiClient.post('/backup/restore', payload);
    return res.data;
  },
  getRestoreHistory: async () => {
    const res = await apiClient.get('/backup/restore-history');
    return res.data;
  }
};

// Audit API
export const auditApi = {
  getLogs: async (filters = {}) => {
    const res = await apiClient.get('/audit', { params: filters });
    return res.data;
  }
};

