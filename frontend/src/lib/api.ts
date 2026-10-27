/**
 * Centralized API Client for HEXNS CRM
 * Connects Next.js frontend to FastAPI backend
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, '');

const TOKEN_KEY = 'hexns_access_token';

// In-memory token cache with fallback to localStorage
let inMemoryToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return inMemoryToken;
  try {
    return inMemoryToken || localStorage.getItem(TOKEN_KEY);
  } catch {
    return inMemoryToken;
  }
}

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Storage access blocked or restricted
    }
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, skipAuth = false, ...fetchOptions } = options;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      netErr?.message || 'Network connection to backend server failed. Please ensure the backend is running.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let body: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      setAuthToken(null);
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    let errorMessage = `HTTP error ${response.status}`;
    let errorCode = 'API_ERROR';
    let errorDetails: any = null;

    if (body) {
      if (typeof body.detail === 'string') {
        errorMessage = body.detail;
      } else if (Array.isArray(body.detail)) {
        errorMessage = body.detail.map((e: any) => `${e.loc?.slice(-1)[0] || 'Field'}: ${e.msg}`).join(', ');
        errorDetails = body.detail;
        errorCode = 'VALIDATION_ERROR';
      } else if (body.error) {
        errorMessage = body.error.message || errorMessage;
        errorCode = body.error.code || errorCode;
        errorDetails = body.error.details;
      }
    }

    throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  return body as T;
}

// -------------------------------------------------------------
// Typed Resource APIs matching Backend Routers and Schemas
// -------------------------------------------------------------

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    fetchApi<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    }),

  getMe: () =>
    fetchApi<{ id: string; email: string; full_name: string; is_active: boolean }>('/auth/me', {
      method: 'GET',
    }),
};

export const clientsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/clients', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/clients/${id}`),

  create: (data: any) =>
    fetchApi<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archive: (id: string) =>
    fetchApi<void>(`/clients/${id}`, {
      method: 'DELETE',
    }),
};

export const servicesApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/services', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/services/${id}`),

  create: (data: any) =>
    fetchApi<any>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/services/${id}`, {
      method: 'DELETE',
    }),
};

export const packagesApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/packages', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/packages/${id}`),

  create: (data: any) =>
    fetchApi<any>('/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/packages/${id}`, {
      method: 'DELETE',
    }),
};

export const quotationsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string; client_id?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/quotations', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/quotations/${id}`),

  create: (data: any) =>
    fetchApi<any>('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/quotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/quotations/${id}`, {
      method: 'DELETE',
    }),

  convert: (id: string, params: { invoice_number: string; due_date: string }) =>
    fetchApi<any>(`/quotations/${id}/convert`, {
      method: 'POST',
      params,
    }),
};

export const invoicesApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string; client_id?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/invoices', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/invoices/${id}`),

  create: (data: any) =>
    fetchApi<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/invoices/${id}`, {
      method: 'DELETE',
    }),
};

export const paymentsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string; invoice_id?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/payments', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/payments/${id}`),

  create: (data: any) =>
    fetchApi<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/payments/${id}`, {
      method: 'DELETE',
    }),
};

export const expensesApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string; category?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/expenses', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/expenses/${id}`),

  create: (data: any) =>
    fetchApi<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/expenses/${id}`, {
      method: 'DELETE',
    }),
};

export const retainersApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; status?: string; client_id?: string }) =>
    fetchApi<{ items: any[]; total: number; page: number; page_size: number }>('/retainers', {
      method: 'GET',
      params,
    }),

  get: (id: string) => fetchApi<any>(`/retainers/${id}`),

  create: (data: any) =>
    fetchApi<any>('/retainers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchApi<any>(`/retainers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/retainers/${id}`, {
      method: 'DELETE',
    }),
};

export const settingsApi = {
  getCompany: () => fetchApi<any>('/settings/company'),

  updateCompany: (data: any) =>
    fetchApi<any>('/settings/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
