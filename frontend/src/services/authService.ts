import api from "./api";
import { LoginFormValues, User, RegisterFormValues } from "../types/auth";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export async function login(values: LoginFormValues): Promise<AuthResponse | null> {
  try {
    const response = await api.post<ApiResponse<AuthResponse>>("/auth/login", values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}


export async function register(values: RegisterFormValues): Promise<AuthResponse | null> {
  try {
    const response = await api.post<ApiResponse<AuthResponse>>("/auth/register", values);
    return response.data.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
