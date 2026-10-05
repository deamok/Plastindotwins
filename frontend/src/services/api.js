import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Otomatis pasang JWT token jika tersedia di localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor untuk handling token expired / invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  googleLogin: (data) => api.post('/auth/google', data),
  registerEmployee: (data) => api.post('/auth/register-employee', data),
  getRegisteredGoogleEmployees: () => api.get('/auth/google-employees'),
  getMe: () => api.get('/auth/me'),
};

export const productService = {
  getProducts: (params) => api.get('/products', { params }),
  getCategories: () => api.get('/products/categories'),
  getNextSku: (params) => api.get('/products/next-sku', { params }),
  createProduct: (data) => api.post('/products/create', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  adjustStock: (data) => api.post('/products/adjust-stock', data),
};

export const saleService = {
  getSales: (params) => api.get('/sales', { params }),
  createSale: (data) => api.post('/sales', data),
  reviewOffer: (id, data) => api.put(`/sales/${id}/review`, data),
  approveToInvoice: (id) => api.put(`/sales/${id}/approve-to-invoice`),
  updateShippingStatus: (id, data) => api.put(`/sales/${id}/shipping`, data),
  updateSale: (id, data) => api.put(`/sales/${id}`, data),
  deleteSale: (id) => api.delete(`/sales/${id}`),
};

export const purchaseService = {
  getPurchases: () => api.get('/purchases'),
  createPurchase: (data) => api.post('/purchases', data),
  deletePurchase: (id) => api.delete(`/purchases/${id}`),
};

export const contactService = {
  getContacts: (params) => api.get('/contacts', { params }),
  getContactById: (id) => api.get(`/contacts/${id}`),
  createContact: (data) => api.post('/contacts', data),
  updateContact: (id, data) => api.put(`/contacts/${id}`, data),
  approveEmployee: (id, data) => api.put(`/contacts/${id}/approve`, data),
  rejectEmployee: (id) => api.put(`/contacts/${id}/reject`),
  deleteContact: (id) => api.delete(`/contacts/${id}`),
};

export const locationService = {
  getLocations: () => api.get('/locations'),
  transferStock: (data) => api.post('/locations/transfer', data),
  getTransfers: () => api.get('/locations/transfers'),
};

export const auditService = {
  getAuditLogs: (params) => api.get('/audit-logs', { params }),
  getAuditStats: () => api.get('/audit-logs/stats'),
  cleanupAuditLogs: (days) => api.post('/audit-logs/cleanup', { days }),
};

export default api;
