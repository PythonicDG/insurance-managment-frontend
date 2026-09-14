import axios from "axios";

const API_BASE = "/api";
const BACKEND_FALLBACK = "http://127.0.0.1:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Attach token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("insure_token");
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Fallback to backend direct URL if proxy rewrite fails or ECONNREFUSED
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      !originalRequest._retry &&
      axios.isAxiosError(error) &&
      (!error.response || error.code === "ECONNREFUSED")
    ) {
      originalRequest._retry = true;
      originalRequest.baseURL = BACKEND_FALLBACK;
      return axios(originalRequest);
    }
    return Promise.reject(error);
  }
);

// Types
export interface InsuranceCompany {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: number;
  business_name: string;
  logo: string | null;
  logo_url: string | null;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

// API Services
export const companyService = {
  async getAll(params?: { search?: string; is_active?: string | boolean }): Promise<InsuranceCompany[]> {
    const response = await apiClient.get<InsuranceCompany[]>("/insurance/companies/", {
      params,
    });
    return response.data;
  },

  async create(data: { name: string; is_active?: boolean }): Promise<InsuranceCompany> {
    const response = await apiClient.post<InsuranceCompany>("/insurance/companies/", data);
    return response.data;
  },

  async update(
    id: number,
    data: { name?: string; is_active?: boolean }
  ): Promise<InsuranceCompany> {
    const response = await apiClient.patch<InsuranceCompany>(`/insurance/companies/${id}/`, data);
    return response.data;
  },

  async toggleStatus(id: number): Promise<{ message: string; data: InsuranceCompany }> {
    const response = await apiClient.post<{ message: string; data: InsuranceCompany }>(
      `/insurance/companies/${id}/toggle-status/`
    );
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/insurance/companies/${id}/`);
  },
};

export const settingsService = {
  async get(): Promise<BusinessSettings> {
    const response = await apiClient.get<BusinessSettings>("/settings/");
    return response.data;
  },

  async update(data: FormData | Partial<BusinessSettings>): Promise<{ message: string; data: BusinessSettings }> {
    const isFormData = data instanceof FormData;
    const response = await apiClient.patch<{ message: string; data: BusinessSettings }>(
      "/settings/",
      data,
      isFormData
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined
    );
    return response.data;
  },

  async removeLogo(): Promise<{ message: string; data: BusinessSettings }> {
    const response = await apiClient.post<{ message: string; data: BusinessSettings }>(
      "/settings/remove-logo/"
    );
    return response.data;
  },
};

export const authService = {
  getCurrentUser(): UserProfile | null {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("insure_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("insure_token");
  },

  async changePassword(payload: {
    old_password: string;
    new_password: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      "/auth/change-password/",
      payload
    );
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout/");
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("insure_token");
        localStorage.removeItem("insure_user");
      }
    }
  },
};

