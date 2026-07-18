import api from "./api";
import { LoginFormValues, User, RegisterFormValues } from "../types/auth";


export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export async function login(values: LoginFormValues): Promise<AuthResponse | null> {
  try {
    const response = await api.post<AuthResponse>("/auth/login", values);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function register(values: RegisterFormValues): Promise<AuthResponse | null> {
  try {
    const response = await api.post<AuthResponse>("/auth/register", values);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}
