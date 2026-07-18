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

  const formSchema = isRegister ? registerSchema : loginSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues | RegisterFormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: LoginFormValues | RegisterFormValues) {
    const result = isRegister ? await registerUser(values as RegisterFormValues) : await login(values as LoginFormValues);

    if (result?.accessToken) {
      setToken(result.accessToken);
      setUser(result.user ?? null);
      navigate("/");
    }
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
                {errors.email && <span className="error-text">{errors.email.message}</span>}
              </label>

              <label>
                Username
                <input type="text" {...register("username")} />
                {errors.username && <span className="error-text">{errors.username.message}</span>}
              </label>

              <label>
                First Name
                <input type="text" {...register("firstName")} />
                {errors.firstName && <span className="error-text">{errors.firstName.message}</span>}
              </label>

              <label>
                Last Name
                <input type="text" {...register("lastName")} />
                {errors.lastName && <span className="error-text">{errors.lastName.message}</span>}
              </label>

              <label>
                Phone
                <input type="text" {...register("phone")} />
                {errors.phone && <span className="error-text">{errors.phone.message}</span>}
              </label>
            </>
          )}

          {!isRegister && (
            <label>
              Email or Username
              <input type="text" {...register("emailOrUsername")} />
              {errors.emailOrUsername && (
                <span className="error-text">{errors.emailOrUsername.message}</span>
              )}
            </label>
          )}

          <label>
            Password
            <input type="password" {...register("password")} />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </label>

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? (isRegister ? "Registering..." : "Logging in...") : isRegister ? "Register" : "Login"}
          </button>
        </form>

        <button type="button" className="button button-secondary" onClick={() => setIsRegister((state) => !state)}>
          {isRegister ? "Go to Login" : "Create Account"}
        </button>
      </div>
    </main>
  );
}
