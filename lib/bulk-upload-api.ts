import { apiClient } from "@/lib/api";

export interface UploadTemplate {
  id: number;
  name: string;
  target: "customers" | "insurance";
  description: string;
  columns: { name: string; required: boolean; default: string }[];
}

export interface UploadResult {
  valid: boolean;
  total_rows: number;
  created: number;
  skipped: number;
  errors: { row: number; errors: Record<string, unknown> | unknown[] }[];
  warnings: string[];
  sample: { row: number; status: string; values: Record<string, string> }[];
  preview_token?: string;
  message?: string;
}

export const bulkUploadService = {
  async templates(): Promise<UploadTemplate[]> {
    return (await apiClient.get("/bulk-upload/templates/")).data;
  },
  async download(id: number): Promise<Blob> {
    return (await apiClient.get(`/bulk-upload/templates/${id}/download/`, { responseType: "blob" })).data;
  },
  async submit(id: number, file: File, token?: string): Promise<UploadResult> {
    const data = new FormData();
    data.append("template_id", String(id));
    data.append("file", file);
    if (token) data.append("preview_token", token);
    return (await apiClient.post(`/bulk-upload/${token ? "import" : "preview"}/`, data, { timeout: 120000 })).data;
  },
};
