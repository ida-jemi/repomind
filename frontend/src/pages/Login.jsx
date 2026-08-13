import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = mode === "login" ? await api.login(form) : await api.signup(form);
      localStorage.setItem("repomind_token", res.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 pt-16">
      <h1 className="font-display text-3xl mb-1">{mode === "login" ? "Sign in" : "Create an account"}</h1>
      <p className="text-sm text-site-muted mb-8">
        Accounts save your dig history. Guest analyses work too — just skip this.
      </p>

      {error && (
        <div className="mb-4 text-sm text-site-rust border border-site-rust/30 bg-site-rust/10 rounded px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        )}
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 px-4 py-2.5 rounded bg-site-amber text-site-bg text-sm font-semibold hover:bg-site-amber/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-4 text-sm text-site-muted hover:text-site-bone transition-colors"
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

function Field({ label, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs text-site-muted mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full bg-site-surface border border-site-line rounded px-3 py-2.5 text-sm text-site-bone focus:border-site-amber/50 outline-none"
      />
    </label>
  );
}
