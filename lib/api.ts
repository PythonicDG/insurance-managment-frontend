import axios from "axios";

const API_BASE = `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Helper to get token (strictly sessionStorage for tab/window session lifecycle)
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("insure_token");
};

// Attach token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized (e.g. session expired or invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        const hadToken = Boolean(getAuthToken());
        sessionStorage.removeItem("insure_token");
        sessionStorage.removeItem("insure_user");
        sessionStorage.removeItem("insure_last_activity");
        localStorage.removeItem("insure_token");
        localStorage.removeItem("insure_user");
        localStorage.removeItem("insure_last_activity");

        if (hadToken && window.location.pathname !== "/") {
          window.location.href = "/?reason=session_expired";
        }
      }
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

export interface CustomerVehicleItem {
  id: number;
  vehicle_type: string;
  vehicle_number: string;
  records_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerDocumentItem {
  id: number;
  record_id: number;
  policy_number: string;
  vehicle_number: string;
  company_name: string;
  document_name: string;
  file?: string;
  file_url?: string;
  file_size?: number;
  uploaded_at: string;
}

export interface CustomerSummary {
  id?: number;
  customer_id?: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicles_count?: number;
  vehicles?: VehicleSummary[];
  created_at?: string;
  updated_at?: string;
}

export interface CustomerDetailResponse extends CustomerSummary {
  total_records?: number;
  total_premium?: number | string;
  total_paid?: number | string;
  total_outstanding?: number | string;
  vehicles?: CustomerVehicleItem[];
}

export interface CustomerLookupResponse {
  phone: string;
  found: boolean;
  count: number;
  customers: CustomerSummary[];
  customer: CustomerSummary | null;
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
  insurance_record?: number;
  insurance_record_id?: number;
  date?: string;
  payment_date?: string;
  payment_mode?: string;
  payment_method?: string;
  amount: number | string;
  note?: string;
  notes?: string;
  status?: string;
  payment_status?: string;
  is_outstanding?: boolean;
  created_at?: string;
  updated_at?: string;
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
  total_paid?: number | string;
  outstanding?: number | string;
  payment_status?: "UNPAID" | "PARTIAL" | "PAID" | string;
  remarks?: string;
  customer: CustomerSummary;
  vehicle: VehicleSummary;
  insurance_company: InsuranceCompanySummary;
  vehicle_class?: string;
  is_active?: boolean;
  is_expired?: boolean;
  days_left?: number;
  status?: "active" | "expiring_soon" | "expired" | string;
  documents_count?: number;
  documents?: InsuranceDocumentItem[];
  payments?: PaymentTransaction[];
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
  customer_id?: number;
  create_new_customer?: boolean;
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
  initial_payment?: number | string;
  paid_amount?: number | string;
  initial_payment_method?: string;
  initial_payment_date?: string;
  payment_method?: string;
  payment_mode?: string;
  payment_date?: string;
  remarks?: string;
  is_renewal?: boolean;
  renew_from_id?: number;
}

export interface DuplicateCheckResponse {
  is_duplicate: boolean;
  message?: string;
  record: InsuranceRecordItem | null;
}

export interface VehicleCheckResponse {
  exists: boolean;
  vehicle_number: string;
  vehicle_id?: number;
  vehicle_type?: string;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  has_active_policy: boolean;
  active_record: InsuranceRecordItem | null;
  has_expired_policy: boolean;
  latest_expired_record: InsuranceRecordItem | null;
  history_count: number;
  message?: string;
}

export interface VehicleHistoryResponse {
  vehicle_id: number;
  vehicle_number: string;
  total_records: number;
  records: InsuranceRecordItem[];
}

export function extractApiError(
  err: unknown,
  fallbackMessage = "An unexpected error occurred. Please try again."
): {
  message: string;
  policyNumberError?: string;
  fieldErrors?: Record<string, string>;
} {
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data;
    if (typeof data === "string") {
      return { message: data };
    }
    if (typeof data === "object" && data !== null) {
      const fieldErrors: Record<string, string> = {};
      let policyNumberError: string | undefined;

      for (const [key, val] of Object.entries(data)) {
        const errorText = Array.isArray(val) ? String(val[0]) : String(val);
        fieldErrors[key] = errorText;
        if (key === "policy_number") {
          policyNumberError = errorText;
        }
      }

      const firstMessage =
        policyNumberError ||
        fieldErrors["detail"] ||
        fieldErrors["message"] ||
        fieldErrors["non_field_errors"] ||
        Object.values(fieldErrors)[0] ||
        fallbackMessage;

      return {
        message: firstMessage,
        policyNumberError,
        fieldErrors,
      };
    }
  } else if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: fallbackMessage };
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
      const saved = sessionStorage.getItem("insure_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return getAuthToken();
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

  async pingSession(): Promise<boolean> {
    try {
      await apiClient.post("/auth/ping/");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("insure_last_activity", Date.now().toString());
        localStorage.setItem("insure_last_activity", Date.now().toString());
      }
      return true;
    } catch {
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout/");
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("insure_token");
        sessionStorage.removeItem("insure_user");
        sessionStorage.removeItem("insure_last_activity");
        localStorage.removeItem("insure_token");
        localStorage.removeItem("insure_user");
        localStorage.removeItem("insure_last_activity");
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

  async checkDuplicatePolicy(
    policyNumber: string,
    excludeId?: number | string
  ): Promise<DuplicateCheckResponse> {
    const response = await apiClient.get<DuplicateCheckResponse>(
      "/insurance/records/check-duplicate/",
      {
        params: {
          policy_number: policyNumber.trim(),
          exclude_id: excludeId,
        },
      }
    );
    return response.data;
  },

  async checkVehicle(
    vehicleNumber: string,
    excludeId?: number | string
  ): Promise<VehicleCheckResponse> {
    const response = await apiClient.get<VehicleCheckResponse>(
      "/insurance/records/check-vehicle/",
      {
        params: {
          vehicle_number: vehicleNumber.trim(),
          exclude_id: excludeId,
        },
      }
    );
    return response.data;
  },

  async renewPolicy(
    recordId: number,
    data: Partial<InsuranceRecordPayload>
  ): Promise<{ message: string; data: InsuranceRecordItem; previous_record_id: number }> {
    const response = await apiClient.post<{
      message: string;
      data: InsuranceRecordItem;
      previous_record_id: number;
    }>(`/insurance/records/${recordId}/renew/`, data);
    return response.data;
  },

  async getVehicleHistory(
    recordId: number
  ): Promise<VehicleHistoryResponse> {
    const response = await apiClient.get<VehicleHistoryResponse>(
      `/insurance/records/${recordId}/vehicle-history/`
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

export const customerService = {
  async lookup(phone: string): Promise<CustomerLookupResponse> {
    const response = await apiClient.get<CustomerLookupResponse>("/customers/lookup/", {
      params: { phone: phone.trim() },
    });
    return response.data;
  },

  async getAll(params?: { search?: string; phone?: string }): Promise<CustomerSummary[]> {
    const response = await apiClient.get<CustomerSummary[] | { results: CustomerSummary[] }>("/customers/", {
      params,
    });
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return (response.data as { results: CustomerSummary[] }).results || [];
  },

  async getById(id: number | string): Promise<CustomerDetailResponse> {
    const response = await apiClient.get<CustomerDetailResponse>(`/customers/${id}/`);
    return response.data;
  },

  async getRecords(
    id: number | string,
    params?: { ordering?: string }
  ): Promise<InsuranceRecordItem[]> {
    const response = await apiClient.get<InsuranceRecordItem[]>(`/customers/${id}/records/`, {
      params,
    });
    return response.data;
  },

  async getVehicles(id: number | string): Promise<CustomerVehicleItem[]> {
    const response = await apiClient.get<CustomerVehicleItem[]>(`/customers/${id}/vehicles/`);
    return response.data;
  },

  async getDocuments(id: number | string): Promise<CustomerDocumentItem[]> {
    const response = await apiClient.get<CustomerDocumentItem[]>(`/customers/${id}/documents/`);
    return response.data;
  },

  async create(data: Partial<CustomerSummary>): Promise<CustomerSummary> {
    const response = await apiClient.post<CustomerSummary>("/customers/", data);
    return response.data;
  },

  async update(id: number | string, data: Partial<CustomerSummary>): Promise<CustomerDetailResponse> {
    const response = await apiClient.patch<CustomerDetailResponse>(`/customers/${id}/`, data);
    return response.data;
  },
};

export const paymentService = {
  async getByRecordId(recordId: number): Promise<PaymentTransaction[]> {
    const response = await apiClient.get<PaymentTransaction[]>(
      `/insurance/records/${recordId}/payments/`
    );
    return response.data;
  },

  async create(data: {
    recordId: number;
    amount: number;
    payment_mode?: string;
    payment_method?: string;
    payment_date?: string;
    notes?: string;
    remark?: string;
  }): Promise<{
    message: string;
    data: PaymentTransaction;
    total_paid: string;
    outstanding: string;
    payment_status: string;
  }> {
    const response = await apiClient.post(
      `/insurance/records/${data.recordId}/payments/`,
      {
        amount: data.amount,
        payment_method: data.payment_method || data.payment_mode || "Cash",
        payment_date: data.payment_date,
        notes: data.notes || data.remark || "",
      }
    );
    return response.data;
  },

  async delete(recordId: number, paymentId: number | string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/insurance/records/${recordId}/payments/${paymentId}/`
    );
    return response.data;
  },

  async getHistory(recordId: number): Promise<{
    insurance_record_id: number;
    total_premium: string;
    total_paid: string;
    outstanding: string;
    status: string;
    payment_status: string;
    payments: PaymentTransaction[];
    transactions: PaymentTransaction[];
  }> {
    const response = await apiClient.get(
      `/insurance/records/${recordId}/payment-history/`
    );
    return response.data;
  },
};

export interface DashboardKpiMetrics {
  today_entries: number;
  today_premium: number;
  today_received: number;
  total_outstanding: number;
  all_time_outstanding?: number;
  total_policies: number;
  total_premium: number;
  total_received: number;
  filter_start_date?: string | null;
  filter_end_date?: string | null;
  is_all_time?: boolean;
}

export interface BusinessSummaryItem {
  month: string;
  year: number;
  month_key: string;
  premium_collected: number;
  outstanding: number;
}

export interface PaymentStatusCategory {
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentStatusSummary {
  total_policies: number;
  paid: PaymentStatusCategory;
  partial: PaymentStatusCategory;
  outstanding: PaymentStatusCategory;
}

export interface CompanyWiseSummaryItem {
  company_id: number;
  company_name: string;
  policy_count: number;
  total_premium: number;
  premium_collected: number;
  outstanding: number;
  share_percentage: number;
  collection_rate: number;
}

export interface DashboardRecentRecord {
  id: number;
  policy_number: string;
  entry_date: string;
  formatted_date: string;
  customer_name: string;
  customer_phone?: string;
  vehicle_number: string;
  vehicle_type?: string;
  insurance_company?: string;
  total_premium: number;
  paid_amount: number;
  outstanding: number;
  status: "Paid" | "Partial" | "Outstanding" | string;
}

export interface DashboardData {
  kpis: DashboardKpiMetrics;
  business_summary: BusinessSummaryItem[];
  payment_status_summary: PaymentStatusSummary;
  company_wise_summary: CompanyWiseSummaryItem[];
  recent_records: DashboardRecentRecord[];
}

export interface BusinessSummaryResponse {
  business_summary: BusinessSummaryItem[];
}

export const dashboardService = {
  async getSummary(params?: {
    months?: number;
    start_date?: string;
    end_date?: string;
    filter?: string;
  }): Promise<DashboardData> {
    const response = await apiClient.get<DashboardData>("/dashboard/summary/", {
      params,
    });
    return response.data;
  },

  async getBusinessSummary(params?: {
    start_month?: string;
    end_month?: string;
    start_date?: string;
    end_date?: string;
    ref_year?: number;
    ref_month?: number;
    months?: number;
  }): Promise<BusinessSummaryItem[]> {
    const response = await apiClient.get<BusinessSummaryResponse>(
      "/dashboard/business-summary/",
      { params }
    );
    return response.data.business_summary;
  },
};

export interface LedgerSummary {
  total_outstanding: number;
  total_customers_pending: number;
  total_received: number;
  total_premium: number;
}

export interface LedgerRecord {
  id: number;
  policy_number: string;
  entry_date: string;
  policy_start_date?: string;
  policy_expiry_date?: string;
  total_premium: number | string;
  paid_amount: number | string;
  outstanding: number | string;
  status: "Partial" | "Outstanding" | "Paid" | string;
  payment_status: "PARTIAL" | "UNPAID" | "PAID" | string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  vehicle_id: number;
  vehicle_number: string;
  vehicle_type?: string;
  insurance_company_id: number;
  insurance_company_name: string;
  payments_count?: number;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  payments?: PaymentTransaction[];
  transactions?: PaymentTransaction[];
}

export interface LedgerResponse {
  summary: LedgerSummary;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: LedgerRecord[];
}

export const ledgerService = {
  async getLedger(params?: {
    search?: string;
    insurance_company_id?: number | string;
    payment_status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
    ordering?: string;
    summary_scope?: string;
  }): Promise<LedgerResponse> {
    const response = await apiClient.get<LedgerResponse>("/payments/ledger/", {
      params,
    });
    return response.data;
  },

  async getSummary(params?: {
    search?: string;
    insurance_company_id?: number | string;
    date_from?: string;
    date_to?: string;
  }): Promise<LedgerSummary> {
    const response = await apiClient.get<LedgerSummary>("/payments/ledger/summary/", {
      params,
    });
    return response.data;
  },

  async getRecordDetail(id: number): Promise<LedgerRecord> {
    const response = await apiClient.get<LedgerRecord>(`/payments/ledger/${id}/`);
    return response.data;
  },
};



