import axios from "axios";

const API_BASE = `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")}/api`;

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

export interface CustomerSummary {
  id?: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface VehicleSummary {
  id?: number;
  vehicle_type: string;
  vehicle_number: string;
}

export interface InsuranceCompanySummary {
  id?: number;
  name: string;
  is_active?: boolean;
}

export interface InsuranceDocumentItem {
  id: number;
  record?: number;
  file?: string;
  file_url?: string;
  document_name: string;
  file_size?: number;
  uploaded_at: string;
}

export interface PaymentTransaction {
  id: string | number;
  date: string;
  payment_mode: string;
  amount: number;
  note: string;
  is_outstanding?: boolean;
}

export interface InsuranceRecordItem {
  id: number;
  policy_number: string;
  entry_date: string;
  policy_start_date: string;
  policy_expiry_date: string;
  total_premium: number | string;
  paid_amount?: number;
  balance?: number;
  remarks?: string;
  customer: CustomerSummary;
  vehicle: VehicleSummary;
  insurance_company: InsuranceCompanySummary;
  vehicle_class?: string;
  is_expired?: boolean;
  days_left?: number;
  status?: "active" | "expiring_soon" | "expired" | string;
  documents_count?: number;
  documents?: InsuranceDocumentItem[];
  transactions?: PaymentTransaction[];
  created_at?: string;
  updated_at?: string;
}

export interface InsuranceRecordListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InsuranceRecordItem[];
}

export interface InsuranceRecordPayload {
  policy_number: string;
  insurance_company_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  vehicle_number: string;
  vehicle_type?: string;
  policy_start_date: string;
  policy_expiry_date: string;
  entry_date?: string;
  total_premium: number;
  remarks?: string;
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

export const insuranceRecordService = {
  async getAll(
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<InsuranceRecordListResponse | InsuranceRecordItem[]> {
    const response = await apiClient.get("/insurance/records/", { params });
    return response.data;
  },

  async getById(id: number): Promise<InsuranceRecordItem> {
    const response = await apiClient.get<InsuranceRecordItem>(
      `/insurance/records/${id}/`
    );
    return response.data;
  },

  async create(
    data: InsuranceRecordPayload
  ): Promise<{ message: string; data: InsuranceRecordItem }> {
    const response = await apiClient.post<{
      message: string;
      data: InsuranceRecordItem;
    }>("/insurance/records/", data);
    return response.data;
  },

  async update(
    id: number,
    data: Partial<InsuranceRecordPayload>
  ): Promise<{ message: string; data: InsuranceRecordItem }> {
    const response = await apiClient.patch<{
      message: string;
      data: InsuranceRecordItem;
    }>(`/insurance/records/${id}/`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/insurance/records/${id}/`
    );
    return response.data;
  },
};

export const insuranceDocumentService = {
  async upload(
    recordId: number,
    file: File,
    documentName?: string
  ): Promise<{ message: string; data: InsuranceDocumentItem }> {
    const formData = new FormData();
    formData.append("file", file);
    if (documentName) {
      formData.append("document_name", documentName);
    }
    const response = await apiClient.post<{
      message: string;
      data: InsuranceDocumentItem;
    }>(`/insurance/records/${recordId}/documents/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async delete(
    recordId: number,
    documentId: number
  ): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/insurance/records/${recordId}/documents/${documentId}/`
    );
    return response.data;
  },
};


