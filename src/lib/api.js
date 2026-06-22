/**
 * API Client for FastAPI Backend
 * Replaces Supabase client for all API calls
 */

// Use Next.js API proxy to avoid cross-origin cookie issues
const API_URL = '';

/**
 * Base fetch wrapper with credentials for cookie auth
 */
async function apiFetch(endpoint, options = {}) {
  // Route through Next.js proxy: /api/auth/login -> /api/proxy/auth/login
  const proxyEndpoint = endpoint.replace('/api/', '/api/proxy/');
  const url = `${API_URL}${proxyEndpoint}`;
  
  const config = {
    ...options,
    credentials: 'include', // Required for HTTP-only cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  const response = await fetch(url, config);
  
  // Handle common error cases
  if (response.status === 401) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg = errBody.detail || errBody.message || 'Not authenticated';
    // Session expired or not authenticated — redirect to login if not already there
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/portal/login';
    }
    throw new Error(errMsg);
  }
  
  if (response.status === 403) {
    throw new Error('Access denied');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }
  
  return response.json();
}

/**
 * Auth API
 */
export const auth = {
  /**
   * Login with email and password
   */
  async login(email, password) {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  /**
   * Logout current session
   */
  async logout() {
    return apiFetch('/api/auth/logout', {
      method: 'POST',
    });
  },
  
  /**
   * Get current session and user info
   */
  async getSession() {
    try {
      return await apiFetch('/api/auth/session');
    } catch (error) {
      return { authenticated: false, user: null, profile: null };
    }
  },
  
  /**
   * Request password reset email
   */
  async requestPasswordReset(email) {
    return apiFetch('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  
  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    return apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  /**
   * Public self-serve signup: { email, password, full_name, company, plan }
   */
  async register(data) {
    return apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Membership plans — public catalog for /pricing and /signup
 */
export const plans = {
  list: () => apiFetch('/api/plans'),
};

/**
 * Billing — self-serve subscription checkout (Stripe)
 */
export const billing = {
  config: () => apiFetch('/api/billing/config'),
  checkout: (plan) => apiFetch('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
};

/**
 * EMS QA single sign-on — mint a one-time token and hand the browser off to the
 * EMS QA app (no second login). Only members with the add-on can call this.
 */
export const emsQa = {
  /** Ask the portal to mint a signed SSO token: { sso_url, token }. */
  async launch() {
    return apiFetch('/api/sso/launch-ems-qa', { method: 'POST' });
  },
  /** Mint a token and POST it to the EMS QA app as a top-level navigation, so the
   *  session cookie is set first-party on the EMS QA domain. */
  async open() {
    const { sso_url, token } = await emsQa.launch();
    if (typeof document === 'undefined') return;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = sso_url;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'token';
    input.value = token;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  },
};

/**
 * Users/Profiles API
 */
export const users = {
  /**
   * Get current user's profile
   */
  async getMyProfile() {
    return apiFetch('/api/profiles/me');
  },
  
  /**
   * Update current user's profile
   */
  async updateMyProfile(updates) {
    return apiFetch('/api/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  
  /**
   * List all users (admin only)
   */
  async list() {
    return apiFetch('/api/profiles/');
  },
  
  /**
   * Get a specific user's profile (admin only)
   */
  async get(userId) {
    return apiFetch(`/api/profiles/${userId}`);
  },
  
  /**
   * Update a user's profile (admin only)
   */
  async update(userId, updates) {
    return apiFetch(`/api/profiles/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  
  /**
   * Update a user's role (admin only)
   */
  async updateRole(userId, role) {
    return apiFetch(`/api/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
};

/**
 * Messages API
 */
/**
 * Client feedback API — recommendations & issues
 */
export const feedback = {
  /** List the current client's submissions */
  list: () => apiFetch('/api/feedback/'),
  /** Submit a recommendation or issue: { type, title, body } */
  create: (data) => apiFetch('/api/feedback/', { method: 'POST', body: JSON.stringify(data) }),
  /** Delete one of the client's own submissions */
  remove: (id) => apiFetch(`/api/feedback/${id}`, { method: 'DELETE' }),
  // Admin
  listAll: () => apiFetch('/api/feedback/admin'),
  update: (id, data) => apiFetch(`/api/feedback/admin/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const messages = {
  /**
   * Get current user's messages
   */
  async list() {
    return apiFetch('/api/messages/');
  },
  
  /**
   * Get unread message count
   */
  async getUnreadCount() {
    return apiFetch('/api/messages/unread-count');
  },
  
  /**
   * Mark messages as read
   */
  async markRead(messageIds) {
    return apiFetch('/api/messages/mark-read', {
      method: 'POST',
      body: JSON.stringify(messageIds),
    });
  },
  
  /**
   * Delete a message
   */
  async delete(messageId) {
    return apiFetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
  
  /**
   * Delete multiple messages
   */
  async deleteBulk(messageIds) {
    return apiFetch('/api/messages/delete-bulk', {
      method: 'POST',
      body: JSON.stringify(messageIds),
    });
  },
  
  /**
   * Create a message (admin only)
   */
  async create(userId, subject, body, fromName = 'Mullen Analytics') {
    return apiFetch('/api/messages/', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        subject,
        body,
        from_name: fromName,
      }),
    });
  },
  
  /**
   * Get messages for a specific user (admin only)
   */
  async getForUser(userId) {
    return apiFetch(`/api/messages/admin/user/${userId}`);
  },
};

/**
 * Projects API
 */
export const projects = {
  /**
   * List all projects (admin only)
   */
  async list() {
    return apiFetch('/api/projects/');
  },
  
  /**
   * List projects for a specific client (admin only)
   */
  async listForClient(clientId, includeArchived = false) {
    return apiFetch(`/api/projects/client/${clientId}?include_archived=${includeArchived}`);
  },
  
  /**
   * Get a specific project
   */
  async get(projectId) {
    return apiFetch(`/api/projects/${projectId}`);
  },
  
  /**
   * Create a new project (admin only)
   */
  async create(projectData) {
    return apiFetch('/api/projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },
  
  /**
   * Update a project (admin only)
   */
  async update(projectId, updates) {
    return apiFetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  
  /**
   * Archive a project (admin only)
   */
  async archive(projectId) {
    return apiFetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  },
  
  /**
   * Restore an archived project (admin only)
   */
  async restore(projectId) {
    return apiFetch(`/api/projects/${projectId}/restore`, {
      method: 'POST',
    });
  },
  
  /**
   * Get current user's projects (client portal)
   */
  async getMyProjects() {
    return apiFetch('/api/projects/my/projects');
  },

  /**
   * List documents for a project (admin only)
   */
  async listDocuments(projectId, includeArchived = false) {
    return apiFetch(`/api/projects/${projectId}/documents?include_archived=${includeArchived}`);
  },

  /**
   * List invoices for a project (admin only)
   */
  async listInvoices(projectId) {
    return apiFetch(`/api/projects/${projectId}/invoices`);
  },
};

/**
 * Clients API — /api/clients/{client_id}/projects
 */
export const clients = {
  /**
   * List projects for a client (admin sees all, client sees own)
   */
  async listProjects(clientId, includeArchived = false) {
    return apiFetch(`/api/clients/${clientId}/projects?include_archived=${includeArchived}`);
  },

  /**
   * Create a project for a client (admin only)
   */
  async createProject(clientId, projectData) {
    return apiFetch(`/api/clients/${clientId}/projects`, {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },
};

/**
 * Documents API
 */
export const documents = {
  /**
   * List all documents with filters (admin only)
   */
  async list(filters = {}) {
    const params = new URLSearchParams();
    if (filters.clientId) params.append('client_id', filters.clientId);
    if (filters.projectId) params.append('project_id', filters.projectId);
    if (filters.documentType) params.append('document_type', filters.documentType);
    if (filters.visibility) params.append('visibility', filters.visibility);
    if (filters.includeArchived) params.append('include_archived', 'true');
    return apiFetch(`/api/documents/?${params.toString()}`);
  },
  
  /**
   * List documents for a specific client (admin only)
   */
  async listForClient(clientId, projectId = null) {
    let url = `/api/documents/client/${clientId}`;
    if (projectId) url += `?project_id=${projectId}`;
    return apiFetch(url);
  },
  
  /**
   * Get a specific document
   */
  async get(documentId) {
    return apiFetch(`/api/documents/${documentId}`);
  },
  
  /**
   * Upload a file for a client (admin only, multipart)
   */
  async upload(clientId, file, opts = {}) {
    const fd = new FormData();
    fd.append('client_id', clientId);
    fd.append('title', opts.title || file.name);
    fd.append('document_type', opts.document_type || 'deliverable');
    fd.append('visibility', opts.visibility || 'client_visible');
    if (opts.description) fd.append('description', opts.description);
    fd.append('file', file);
    const proxyEndpoint = '/api/proxy/documents/upload';
    const res = await fetch(proxyEndpoint, { method: 'POST', credentials: 'include', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  /**
   * Create a new document record (admin only)
   */
  async create(documentData) {
    return apiFetch('/api/documents/', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  },
  
  /**
   * Update a document (admin only)
   */
  async update(documentId, updates) {
    return apiFetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  
  /**
   * Archive a document (admin only)
   */
  async archive(documentId) {
    return apiFetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
  
  /**
   * Restore an archived document (admin only)
   */
  async restore(documentId) {
    return apiFetch(`/api/documents/${documentId}/restore`, {
      method: 'POST',
    });
  },
  
  /**
   * Get current user's documents (client portal)
   */
  async getMyDocuments(projectId = null) {
    let url = '/api/documents/my/documents';
    if (projectId) url += `?project_id=${projectId}`;
    return apiFetch(url);
  },
};

/**
 * Impersonation API
 */
export const impersonation = {
  /**
   * Start impersonating a client (admin only)
   */
  async start(clientId) {
    return apiFetch('/api/impersonation/start', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId }),
    });
  },
  
  /**
   * End impersonation session (admin only)
   */
  async end() {
    return apiFetch('/api/impersonation/end', {
      method: 'POST',
    });
  },
  
  /**
   * Get current impersonation status (admin only)
   */
  async getStatus() {
    return apiFetch('/api/impersonation/status');
  },
  
  /**
   * Log an action during impersonation (admin only)
   */
  async logAction(action, pagePath = null, actionDetails = null) {
    return apiFetch('/api/impersonation/log', {
      method: 'POST',
      body: JSON.stringify({
        action,
        page_path: pagePath,
        action_details: actionDetails,
      }),
    });
  },
  
  /**
   * Get impersonation logs (admin only)
   */
  async getLogs(clientId = null, limit = 100) {
    let url = '/api/impersonation/logs';
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    params.append('limit', limit.toString());
    return apiFetch(`${url}?${params.toString()}`);
  },
  
  /**
   * Get impersonation logs for a specific client (admin only)
   */
  async getClientLogs(clientId, limit = 50) {
    return apiFetch(`/api/impersonation/logs/client/${clientId}?limit=${limit}`);
  },
};

/**
 * Admin IT/monitoring API — errors, issues, and per-user login history
 */
export const admin = {
  monitoring: () => apiFetch('/api/admin/monitoring'),
  errors: ({ source, resolved } = {}) => {
    const q = new URLSearchParams();
    if (source) q.set('source', source);
    if (resolved != null) q.set('resolved', String(resolved));
    const s = q.toString();
    return apiFetch(`/api/admin/errors${s ? `?${s}` : ''}`);
  },
  errorDetail: (id) => apiFetch(`/api/admin/errors/${id}`),
  resolveError: (id) => apiFetch(`/api/admin/errors/${id}/resolve`, { method: 'PATCH' }),
  userLogins: (userId, limit = 50) => apiFetch(`/api/admin/users/${userId}/logins?limit=${limit}`),
};

/**
 * Report a client-side (browser) error. Fire-and-forget; never throws and never
 * redirects (raw fetch, not apiFetch) so background reporting can't disrupt the user.
 */
export function reportClientError(payload) {
  try {
    return fetch('/api/proxy/errors/client', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    return undefined;
  }
}

/**
 * Invoices API
 */
export const invoices = {
  /**
   * List invoices for a client (admin only)
   */
  async listForClient(clientId) {
    return apiFetch(`/api/invoices/client/${clientId}`);
  },
  
  /**
   * Get current user's invoices (client portal)
   */
  async getMyInvoices() {
    return apiFetch('/api/invoices/my');
  },
};

/**
 * Uploads API
 */
export const uploads = {
  /**
   * List uploads for a client (admin only)
   */
  async listForClient(clientId) {
    return apiFetch(`/api/uploads/client/${clientId}`);
  },
  
  /**
   * Get current user's uploads (client portal)
   */
  async getMyUploads() {
    return apiFetch('/api/uploads/my');
  },
};

/**
 * Reports API
 */
export const reports = {
  /**
   * Generate/create a report (admin only)
   */
  async generate(reportData) {
    return apiFetch('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },
  
  /**
   * List reports for a client (admin only)
   */
  async listForClient(clientId, projectId = null) {
    let url = `/api/reports/client/${clientId}`;
    if (projectId) url += `?project_id=${projectId}`;
    return apiFetch(url);
  },
  
  /**
   * Get current user's reports (client portal)
   */
  async getMyReports(projectId = null) {
    let url = '/api/reports/my';
    if (projectId) url += `?project_id=${projectId}`;
    return apiFetch(url);
  },
};

/**
 * Data uploads API
 */
export const dataUploads = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.client_id) q.set('client_id', params.client_id);
    if (params.project_id) q.set('project_id', params.project_id);
    return apiFetch(`/api/data/uploads?${q}`);
  },
  get: (uploadId) => apiFetch(`/api/data/uploads/${uploadId}`),
  delete: (uploadId) => apiFetch(`/api/data/uploads/${uploadId}`, { method: 'DELETE' }),
  clean: (uploadId) => apiFetch(`/api/data/uploads/${uploadId}/clean`, { method: 'POST' }),
  getCleaningResults: (uploadId) => apiFetch(`/api/data/uploads/${uploadId}/cleaning-results`),
  upload: (formData) =>
    fetch('/api/proxy/data/uploads', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed: ${r.status}`);
      }
      return r.json();
    }),
  downloadOriginalUrl: (uploadId) => `/api/proxy/data/uploads/${uploadId}/download-original`,
  downloadCleanedUrl: (uploadId) => `/api/proxy/data/uploads/${uploadId}/download-cleaned`,
  getDashboard: (uploadId) => apiFetch(`/api/data/uploads/${uploadId}/dashboard`),
  getClientDashboard: (clientId, params = {}) => {
    const q = new URLSearchParams();
    if (params.project_id) q.set('project_id', params.project_id);
    if (params.upload_id) q.set('upload_id', params.upload_id);
    return apiFetch(`/api/data/clients/${clientId}/dashboard?${q}`);
  },
  getProjectDashboard: (projectId) => apiFetch(`/api/data/projects/${projectId}/dashboard`),
};

/**
 * Column Mapping API
 */
export const columnMapping = {
  get: (uploadId) =>
    apiFetch(`/api/data/uploads/${uploadId}/column-mapping`),
  autoDetect: (uploadId) =>
    apiFetch(`/api/data/uploads/${uploadId}/column-mapping/autodetect`, { method: 'POST' }),
  save: (uploadId, mapping) =>
    apiFetch(`/api/data/uploads/${uploadId}/column-mapping`, { method: 'PATCH', body: JSON.stringify({ mapping }) }),
  reset: (uploadId) =>
    apiFetch(`/api/data/uploads/${uploadId}/column-mapping`, { method: 'DELETE' }),
  preview: (uploadId, mapping) =>
    apiFetch(`/api/data/uploads/${uploadId}/preview-metrics`, { method: 'POST', body: JSON.stringify({ mapping }) }),
};

/**
 * Dashboard Filter + Compare API
 */
export const dashboardFilter = {
  getFilterOptions: (uploadId) =>
    apiFetch(`/api/data/uploads/${uploadId}/filter-options`),
  filter: (uploadId, body) =>
    apiFetch(`/api/data/uploads/${uploadId}/dashboard/filter`, { method: 'POST', body: JSON.stringify(body) }),
  compare: (uploadId, body) =>
    apiFetch(`/api/data/uploads/${uploadId}/dashboard/compare`, { method: 'POST', body: JSON.stringify(body) }),
  getColumnSettings: (uploadId) =>
    apiFetch(`/api/data/uploads/${uploadId}/columns/settings`),
  patchColumnSettings: (uploadId, patches) =>
    apiFetch(`/api/data/uploads/${uploadId}/columns/settings`, { method: 'PATCH', body: JSON.stringify(patches) }),
  bulkIgnore: (uploadId, body) =>
    apiFetch(`/api/data/uploads/${uploadId}/columns/bulk-ignore`, { method: 'POST', body: JSON.stringify(body) }),
  restoreColumns: (uploadId, body) =>
    apiFetch(`/api/data/uploads/${uploadId}/columns/restore`, { method: 'POST', body: JSON.stringify(body) }),
};

/**
 * Data Explorer API
 */
export const dataExplorer = {
  getProfile: (uploadId, refresh = false) =>
    apiFetch(`/api/data/uploads/${uploadId}/profile${refresh ? '?refresh=true' : ''}`),
  getColumns: (uploadId) => apiFetch(`/api/data/uploads/${uploadId}/columns`),
  getPreview: (uploadId, limit = 100, offset = 0) =>
    apiFetch(`/api/data/uploads/${uploadId}/preview?limit=${limit}&offset=${offset}`),
  getFilterOptions: (uploadId, column) =>
    apiFetch(`/api/data/uploads/${uploadId}/filters/${encodeURIComponent(column)}`),
  query: (uploadId, body) =>
    apiFetch(`/api/data/uploads/${uploadId}/query`, { method: 'POST', body: JSON.stringify(body) }),
  getChartData: (uploadId, body) =>
    apiFetch(`/api/data/uploads/${uploadId}/chart-data`, { method: 'POST', body: JSON.stringify(body) }),
};

/**
 * Generic API fetch for other endpoints
 */
export { apiFetch };

/**
 * Default export for convenience
 */
export default {
  auth,
  emsQa,
  users,
  messages,
  projects,
  clients,
  documents,
  impersonation,
  admin,
  plans,
  billing,
  invoices,
  uploads,
  reports,
  dataUploads,
  dataExplorer,
  dashboardFilter,
  columnMapping,
  fetch: apiFetch,
};
