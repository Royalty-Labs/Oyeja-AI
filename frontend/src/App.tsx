
import { useState, type FormEvent } from "react";
import { useAuth } from "./context/AuthContext";
import Workspace from "./components/Workspace";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import "./App.css";

type AuthMode = "login" | "register";

function App() {
  const {
  user,
  token,
  isLoading,
  login,
  register,
  logout,
} = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "register") {
      if (password.length < 8) {
        setError("Your password must contain at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register(normalizedEmail, password);
      } else {
        await login(normalizedEmail, password);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  if (isLoading) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">
          <BrainCircuit size={28} />
        </div>
        <p>Preparing your OyejaAI workspace...</p>
      </main>
    );
  }

  if (user) {
  return (
    <Workspace
      user={user}
      token={token}
      onLogout={logout}
    />
  );
}

  return (
    <main className="auth-layout">
      <section className="brand-panel">
        <div className="brand-panel-content">
          <a className="brand brand-light" href="#home">
            <span className="brand-mark">
              <BrainCircuit size={25} />
            </span>
            <span>
              <strong>OyejaAI</strong>
              <small>Business Intelligence</small>
            </span>
          </a>

          <div className="brand-message">
            <span className="eyebrow">
              <Sparkles size={15} />
              INTELLIGENCE FOR GROWING BUSINESSES
            </span>

            <h1>
              Make better
              <br />
              decisions.
              <br />
              <span>Build smarter.</span>
            </h1>

            <p>
              Turn your business data into clearer insights, informed
              decisions, and opportunities for growth.
            </p>
          </div>

          <div className="insight-card">
            <div className="insight-card-top">
              <span className="insight-icon">
                <Activity size={18} />
              </span>
              <span>Business intelligence</span>
              <span className="live-indicator">●</span>
            </div>
            <div className="insight-card-body">
              <div>
                <small>Data-informed decisions</small>
                <strong>Clarity starts here.</strong>
              </div>
              <span className="insight-chart">
                <BarChart3 size={36} />
              </span>
            </div>
            <div className="insight-card-footer">
              <span>
                <Wallet size={14} /> Financial visibility
              </span>
              <span>
                <BrainCircuit size={14} /> AI-assisted insights
              </span>
            </div>
          </div>
        </div>

        <div className="brand-panel-footer">
          <span>BUILT FOR AMBITIOUS BUSINESSES</span>
          <span>OYEJAAI © 2026</span>
        </div>
      </section>

      <section className="form-panel">
        <div className="mobile-brand">
          <span className="brand-mark">
            <BrainCircuit size={23} />
          </span>
          <strong>OyejaAI</strong>
        </div>

        <div className="auth-card">
          <div className="form-heading">
            <span className="form-eyebrow">
              {mode === "login" ? "YOUR WORKSPACE AWAITS" : "GET STARTED"}
            </span>

            <h2>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p>
              {mode === "login"
                ? "Sign in to continue to your business workspace."
                : "Create an account to get started with OyejaAI."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "register" ? "auth-tab active" : "auth-tab"}
              onClick={() => switchMode("register")}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
              />
            </div>

            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              {mode === "register" && (
                <span className="password-hint">8 characters minimum</span>
              )}
            </div>

            <div className="input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
                maxLength={128}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === "register" && (
              <>
                <label htmlFor="confirm-password">Confirm password</label>
                <div className="input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    maxLength={128}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in to OyejaAI"
                  : "Create your account"}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="security-note">
            <ShieldCheck size={17} />
            <span>Your account is protected by secure authentication.</span>
          </div>

          <p className="switch-mode">
            {mode === "login"
              ? "New to OyejaAI?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="form-footer">
          AI-powered business intelligence for Nigerian SMEs.
        </p>
      </section>
    </main>
  );
}

export default App;
