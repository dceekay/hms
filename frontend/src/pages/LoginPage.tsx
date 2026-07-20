import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { loginSchema, LoginFormValues, registerSchema, RegisterFormValues } from "../types/auth";
import { login, register as registerUser } from "../services/authService";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [isRegister, setIsRegister] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formSchema = isRegister ? registerSchema : loginSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues | RegisterFormValues>({
    resolver: zodResolver(formSchema),
  });

  const getFieldError = (field: string) => {
    const typedErrors = errors as Record<string, { message?: string }>;
    return typedErrors[field];
  };

  async function onSubmit(values: LoginFormValues | RegisterFormValues) {
    setSubmitError(null);
    const result = isRegister ? await registerUser(values as RegisterFormValues) : await login(values as LoginFormValues);

    if (result?.accessToken) {
      setToken(result.accessToken);
      setUser(result.user ?? null);
      navigate("/");
      return;
    }

    setSubmitError(isRegister ? "Registration failed. Please check your details." : "Login failed. Check your username and password.");
  }

  return (
    <main className="page-container">
      <div className="card">
        <h1>{isRegister ? "Register" : "Login"}</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          {isRegister && (
            <>
              <label>
                Email
                <input type="email" {...register("email")} />
                {getFieldError("email") && <span className="error-text">{getFieldError("email")?.message}</span>}
              </label>

              <label>
                Username
                <input type="text" {...register("username")} />
                {getFieldError("username") && <span className="error-text">{getFieldError("username")?.message}</span>}
              </label>

              <label>
                First Name
                <input type="text" {...register("firstName")} />
                {getFieldError("firstName") && <span className="error-text">{getFieldError("firstName")?.message}</span>}
              </label>

              <label>
                Last Name
                <input type="text" {...register("lastName")} />
                {getFieldError("lastName") && <span className="error-text">{getFieldError("lastName")?.message}</span>}
              </label>

              <label>
                Phone
                <input type="text" {...register("phone")} />
                {getFieldError("phone") && <span className="error-text">{getFieldError("phone")?.message}</span>}
              </label>
            </>
          )}

          {!isRegister && (
            <label>
              Email or Username
              <input type="text" {...register("emailOrUsername")} />
              {getFieldError("emailOrUsername") && (
                <span className="error-text">{getFieldError("emailOrUsername")?.message}</span>
              )}
            </label>
          )}

          <label>
            Password
            <input type="password" {...register("password")} />
            {getFieldError("password") && <span className="error-text">{getFieldError("password")?.message}</span>}
          </label>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? (isRegister ? "Registering..." : "Logging in...") : isRegister ? "Register" : "Login"}
          </button>

          {submitError && <p className="error-text">{submitError}</p>}
        </form>

        <button type="button" className="button button-secondary" onClick={() => setIsRegister((state) => !state)}>
          {isRegister ? "Go to Login" : "Create Account"}
        </button>
      </div>
    </main>
  );
}
