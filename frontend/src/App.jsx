import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import "./App.css";

const TOKEN_KEY = "sample_app_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const loadMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await api("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setUser({ id: data.user.id, email: data.user.email });
      setPassword("");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setPassword("");
  }

  if (user) {
    return (
      <div className="shell">
        <div className="card">
          <h1>Signed in</h1>
          <p className="muted">Good DevOps practice: never log real passwords; this UI only shows your email.</p>
          <dl className="profile">
            <dt>User ID</dt>
            <dd>{user.id}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            {user.created_at && (
              <>
                <dt>Created</dt>
                <dd>{new Date(user.created_at).toLocaleString()}</dd>
              </>
            )}
          </dl>
          <button type="button" className="btn secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="card">
        <h1>Sample login</h1>
        <p className="muted">
          Postgres + Express API + React. Use this stack to practice containers, env vars, health checks, and CI.
        </p>
        <div className="tabs">
          <button
            type="button"
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={mode === "register" ? "tab active" : "tab"}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
