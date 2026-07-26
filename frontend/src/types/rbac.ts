export interface Permission {
  id: string;
  name: string;
  description?: string | null;
  rolesUsing?: number;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permissions?: { permission: Permission }[];
}

export interface AppUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isActive: boolean;
  roles?: { role: Role }[];
  doctorProfile?: {
    id: string;
    doctorType: "medical_doctor" | "visiting_consultant" | "visiting_specialist";
    specialty?: string | null;
  } | null;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
