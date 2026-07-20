import { FormEvent, useState } from "react";
import axios from "axios";
import { NavBar } from "../components/NavBar";
import { useAuthStore } from "../store/authStore";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestResult = {
  status: number | null;
  data: unknown;
  headers: Record<string, string>;
  elapsedMs: number;
  errorMessage?: string;
};

const defaultBody = JSON.stringify(
  {
    emailOrUsername: "admin",
    password: "Admin@123",
  },
  null,
  2
);

export function APITesterPage() {
  const authToken = useAuthStore((state) => state.token);
  const [baseUrl, setBaseUrl] = useState(
    (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1"
  );
  const [endpoint, setEndpoint] = useState("/health");
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [body, setBody] = useState(defaultBody);
  const [headersText, setHeadersText] = useState('{"Content-Type":"application/json"}');
  const [token, setToken] = useState(authToken ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseJsonField = (value: string, fieldName: string) => {
    if (!value.trim()) {
      return {};
    }

    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${fieldName} must be valid JSON.`);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const startedAt = performance.now();

    try {
      const parsedBody = method === "GET" ? undefined : parseJsonField(body, "Body");
      const parsedHeaders = parseJsonField(headersText, "Headers");
      const selectedToken = token.trim() || authToken || "";

      const client = axios.create({
        baseURL: baseUrl.replace(/\/$/, ""),
      });

      const response = await client.request({
        url: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
        method,
        data: parsedBody,
        headers: {
          ...(parsedHeaders as Record<string, string>),
          ...(selectedToken ? { Authorization: `Bearer ${selectedToken}` } : {}),
        },
      });

      setResult({
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Request failed unexpectedly.";

      setError(message);

      if (axios.isAxiosError(requestError) && requestError.response) {
        setResult({
          status: requestError.response.status ?? null,
          data: requestError.response.data,
          headers: requestError.response.headers as Record<string, string>,
          elapsedMs: Math.round(performance.now() - startedAt),
          errorMessage: message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fillCurrentToken = () => {
    if (authToken) {
      setToken(authToken);
    }
  };

  return (
    <>
      <NavBar />
      <main className="page-container">
        <div className="card">
          <div className="page-header">
            <div>
              <h1>API Tester</h1>
              <p>Send requests directly to the backend while you build the real client.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="tester-grid">
            <div className="tester-panel">
              <label>
                Base URL
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="http://localhost:5000/api/v1"
                />
              </label>

              <label>
                Endpoint
                <input
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  placeholder="/auth/login"
                />
              </label>

              <label>
                Method
                <select value={method} onChange={(event) => setMethod(event.target.value as HttpMethod)}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </label>

              <label>
                Bearer Token
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Optional bearer token"
                />
              </label>

              <div className="tester-actions">
                <button type="button" className="button button-secondary" onClick={fillCurrentToken}>
                  Use Current Token
                </button>
                <button type="submit" className="button" disabled={loading}>
                  {loading ? "Sending..." : "Send Request"}
                </button>
              </div>

              <label>
                Headers (JSON)
                <textarea
                  value={headersText}
                  onChange={(event) => setHeadersText(event.target.value)}
                  rows={5}
                  className="tester-textarea"
                />
              </label>

              <label>
                Body (JSON)
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={10}
                  className="tester-textarea"
                />
              </label>
            </div>

            <div className="tester-output">
              <div className="info-block">
                <strong>Quick presets</strong>
                <div className="preset-list">
                  <button type="button" className="preset-button" onClick={() => setEndpoint("/health")}>
                    Health
                  </button>
                  <button
                    type="button"
                    className="preset-button"
                    onClick={() => {
                      setEndpoint("/auth/login");
                      setMethod("POST");
                      setBody(defaultBody);
                    }}
                  >
                    Login
                  </button>
                  <button type="button" className="preset-button" onClick={() => setEndpoint("/patients")}>
                    Patients
                  </button>
                </div>
              </div>

              {loading && <p>Sending request...</p>}
              {error && <p className="error-text">{error}</p>}

              {result && (
                <div className="info-block">
                  <p>
                    <strong>Status:</strong> {result.status ?? "n/a"}
                  </p>
                  <p>
                    <strong>Time:</strong> {result.elapsedMs}ms
                  </p>
                  {result.errorMessage && <p className="error-text">{result.errorMessage}</p>}
                  <pre>{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              )}
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
