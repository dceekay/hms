import api from "./api";

export type AuditItem = {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";
  entity: string;
  entityId?: string | null;
  createdAt: string;
  ipAddress?: string | null;
  deviceSummary?: string | null;
  actor: { id: string; name: string; username: string } | null;
  summary: string;
  reference?: string | null;
  changes: Array<{
    field: string;
    before?: string | number | boolean | null;
    after?: string | number | boolean | null;
  }>;
};

export async function getSystemActivity(
  params: Record<string, string | number | undefined>
) {
  const response = await api.get("/audit", { params });
  return response.data.data as {
    items: AuditItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
}

