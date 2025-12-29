import axios from "axios";
import type {
  GenerateRequest,
  GenerateResponse,
  Template,
  TemplateCreate,
  HistoryResponse,
  Analytics,
  Run,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Generate API
export const generateAPI = {
  generate: async (data: GenerateRequest): Promise<GenerateResponse> => {
    const response = await api.post("/api/generate", data);
    return response.data;
  },
};

// Templates API
export const templatesAPI = {
  list: async (): Promise<Template[]> => {
    const response = await api.get("/api/templates/");
    return response.data;
  },

  get: async (id: number): Promise<Template> => {
    const response = await api.get(`/api/templates/${id}`);
    return response.data;
  },

  create: async (data: TemplateCreate): Promise<Template> => {
    const response = await api.post("/api/templates/", data);
    return response.data;
  },

  update: async (id: number, data: Partial<TemplateCreate>): Promise<Template> => {
    const response = await api.put(`/api/templates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/templates/${id}`);
  },
};

// History API
export const historyAPI = {
  list: async (params?: {
    template_id?: number;
    provider?: string;
    validation_status?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<HistoryResponse> => {
    const response = await api.get("/api/history/", { params });
    return response.data;
  },

  get: async (id: number): Promise<Run> => {
    const response = await api.get(`/api/history/${id}`);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getAll: async (): Promise<Analytics[]> => {
    const response = await api.get("/api/analytics/");
    return response.data;
  },

  get: async (templateId: number): Promise<Analytics> => {
    const response = await api.get(`/api/analytics/${templateId}`);
    return response.data;
  },
};

export default api;
