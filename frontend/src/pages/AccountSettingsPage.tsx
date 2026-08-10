import { FormEvent, useEffect, useState } from "react";
import { FiKey, FiSave, FiShield, FiUser } from "react-icons/fi";
import AdminLayout from "../layouts/AdminLayout";
import { useAuthStore } from "../store/authStore";
import { updateOwnAccount } from "../services/userService";

type SettingsForm = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function AccountSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<SettingsForm>({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setForm((current) => ({
      ...current,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      username: user.username ?? "",
      phone: user.phone ?? "",
    }));
  }, [user]);

  const updateField = (field: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);

    const result = await updateOwnAccount({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      username: form.username,
      phone: form.phone,
      ...(form.newPassword
        ? {
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          }
        : {}),
    });

    setSaving(false);

    if (!result.user) {
      setError(result.error ?? "Unable to update account settings.");
      return;
    }

    setUser(result.user);
    setForm((current) => ({
      ...current,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
    setSuccess("Account settings updated.");
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="account-settings-page">
          <section className="rbac-header account-settings-header">
            <div>
              <p className="eyebrow">Account</p>
              <h1>Settings</h1>
              <p>Update your login name and password when needed.</p>
            </div>
            <div className="account-settings-badge">
              <FiShield />
              <span>{user?.roles?.join(", ") || "Staff"}</span>
            </div>
          </section>

          <form className="setup-form account-settings-form" onSubmit={handleSubmit}>
            <div className="panel-title">
              <div>
                <h2>Profile and Login</h2>
                <p>Keep your staff account easy to recognize and secure.</p>
              </div>
              <FiUser />
            </div>

            <div className="form-grid">
              <label>
                First name
                <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
              </label>
              <label>
                Last name
                <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
              </label>
              <label>
                Username
                <input value={form.username} onChange={(event) => updateField("username", event.target.value)} required />
              </label>
            </div>

            <div className="account-password-panel">
              <div>
                <FiKey />
                <span>
                  <strong>Change password</strong>
                  <small>Leave these fields blank if you only want to update your profile.</small>
                </span>
              </div>

              <div className="form-grid">
                <label>
                  Current password
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) => updateField("currentPassword", event.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <label>
                  New password
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={(event) => updateField("newPassword", event.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>
              </div>
            </div>

            {error && <p className="registration-error">{error}</p>}
            {success && <p className="security-success">{success}</p>}

            <div className="setup-actions">
              <button className="registration-submit" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save settings"}
                <FiSave />
              </button>
            </div>
          </form>
        </div>
      </main>
    </AdminLayout>
  );
}
