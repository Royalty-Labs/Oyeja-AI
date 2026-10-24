
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Building2,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import TransactionsPanel from "./TransactionsPanel";
import FinancialInsightsPanel from "./FinancialInsightsPanel";
import AIAnalysisPanel from "./AIAnalysisPanel";
import BusinessAnalyticsPanel from "./BusinessAnalyticsPanel";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { businessApi, transactionApi } from "../lib/api";
import type {
  Business,
  TransactionSummary,
  User,
} from "../lib/api";

type WorkspaceProps = {
  user: User;
  token: string | null;
  onLogout: () => void;
};

type Section =
  | "Dashboard"
  | "Transactions"
  | "Business Analytics"
  | "Financial Insights"
  | "AI Analysis"
  | "Business Profile"
  | "Settings";

const navigation: {
  label: Section;
  icon: typeof LayoutDashboard;
  group: "main" | "business" | "account";
}[] = [
  { label: "Dashboard", icon: LayoutDashboard, group: "main" },
  { label: "Transactions", icon: ReceiptText, group: "business" },
  { label: "Business Analytics", icon: BarChart3, group: "business" },
  { label: "Financial Insights", icon: Wallet, group: "business" },
  { label: "AI Analysis", icon: BrainCircuit, group: "business" },
  { label: "Business Profile", icon: Building2, group: "account" },
  { label: "Settings", icon: Settings, group: "account" },
];

const sectionDescriptions: Record<Section, string> = {
  Dashboard: "Your business at a glance.",
  Transactions: "Keep track of money coming into and going out of your business.",
  "Business Analytics": "Understand your business performance through your data.",
  "Financial Insights": "Build a clearer picture of your business finances.",
  "AI Analysis": "Explore your business data with AI-assisted analysis.",
  "Business Profile": "Manage the details of the business you want to analyse.",
  Settings: "Manage your account and workspace preferences.",
};

function Workspace({ user, token, onLogout }: WorkspaceProps) {
    const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError, setBusinessesError] = useState("");
const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
const [businessName, setBusinessName] = useState("");
const [businessType, setBusinessType] = useState("");
const [businessLocation, setBusinessLocation] = useState("");
const [businessCurrency, setBusinessCurrency] = useState("NGN");

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusinessesLoading(false);
      setBusinessesError("Your session token is missing. Please sign in again.");
      return;
    }

    let cancelled = false;

    async function loadBusinesses() {
      setBusinessesLoading(true);
      setBusinessesError("");

      try {
        const result = await businessApi.list(token!);

        if (!cancelled) {
          setBusinesses(result);
        }
      } catch (error) {
        if (!cancelled) {
          setBusinessesError(
            error instanceof Error
              ? error.message
              : "Unable to load your businesses.",
          );
        }
      } finally {
        if (!cancelled) {
          setBusinessesLoading(false);
        }
      }
    }

    void loadBusinesses();

    return () => {
      cancelled = true;
    };
  }, [token]);
async function handleCreateBusiness(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!token) {
    setBusinessesError("Your session has expired. Please sign in again.");
    return;
  }

  setIsCreatingBusiness(true);
  setBusinessesError("");

  try {
    const newBusiness = await businessApi.create(
      {
        name: businessName.trim(),
        business_type: businessType.trim(),
        location: businessLocation.trim(),
        currency: businessCurrency,
      },
      token,
    );

    setBusinesses((currentBusinesses) => [
      ...currentBusinesses,
      newBusiness,
    ]);

    setBusinessName("");
    setBusinessType("");
    setBusinessLocation("");
    setBusinessCurrency("NGN");
  } catch (error) {
    setBusinessesError(
      error instanceof Error
        ? error.message
        : "Unable to create your business. Please try again.",
    );
  } finally {
    setIsCreatingBusiness(false);
  }
}

  const [activeSection, setActiveSection] = useState<Section>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigateTo(section: Section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

  const activeNavigation = navigation.find(
    (item) => item.label === activeSection,
  );
  const ActiveIcon = activeNavigation?.icon ?? LayoutDashboard;

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <a
          className="app-brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("Dashboard");
          }}
        >
          <span className="app-brand-mark">
            <BrainCircuit size={23} />
          </span>
          <span className="app-brand-copy">
            <strong>OyejaAI</strong>
            <small>Business Intelligence</small>
          </span>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSidebarOpen(false);
            }}
          >
            <X size={20} />
          </button>
        </a>

        <div className="sidebar-workspace-label">WORKSPACE</div>

        <nav className="sidebar-navigation" aria-label="Main navigation">
          <div className="nav-group">
            {navigation
              .filter((item) => item.group === "main")
              .map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className={`nav-item ${activeSection === label ? "nav-item-active" : ""}`}
                  onClick={() => navigateTo(label)}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {activeSection === label && (
                    <span className="nav-active-indicator" />
                  )}
                </button>
              ))}
          </div>

          <div className="nav-group">
            <span className="nav-group-heading">BUSINESS TOOLS</span>
            {navigation
              .filter((item) => item.group === "business")
              .map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className={`nav-item ${activeSection === label ? "nav-item-active" : ""}`}
                  onClick={() => navigateTo(label)}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {activeSection === label && (
                    <span className="nav-active-indicator" />
                  )}
                </button>
              ))}
          </div>

          <div className="nav-group">
            <span className="nav-group-heading">PREFERENCES</span>
            {navigation
              .filter((item) => item.group === "account")
              .map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className={`nav-item ${activeSection === label ? "nav-item-active" : ""}`}
                  onClick={() => navigateTo(label)}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {activeSection === label && (
                    <span className="nav-active-indicator" />
                  )}
                </button>
              ))}
          </div>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help-card">
            <span className="help-icon">
              <Sparkles size={17} />
            </span>
            <strong>Built for better decisions</strong>
            <p>Your business intelligence journey starts with your data.</p>
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <strong title={user.email}>{user.email}</strong>
              <span>Account member</span>
            </div>
            <button
              className="sidebar-logout"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={15} />
              <strong>{activeSection}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <span className="topbar-status">
              <span className="status-dot" />
              Workspace active
            </span>
            <div className="topbar-avatar">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="app-page-content">
          <section className="page-heading">
            <div>
              <span className="page-eyebrow">OYEJAAI WORKSPACE</span>
              <h1>{getGreeting(activeSection)}</h1>
              <p>{sectionDescriptions[activeSection]}</p>
            </div>
          </section>

          {activeSection === "Dashboard" ? (
  <DashboardHome
  onNavigate={navigateTo}
  user={user}
  token={token}
  businesses={businesses}
/>
) : activeSection === "Transactions" ? (
  <TransactionsPanel
    token={token}
    businesses={businesses}
  />
) : activeSection === "Business Analytics" ? (
  <BusinessAnalyticsPanel
    token={token}
    businesses={businesses}
  />
) : activeSection === "Financial Insights" ? (
  <FinancialInsightsPanel
    token={token}
    businesses={businesses}
  />
) : activeSection === "AI Analysis" ? (
  <AIAnalysisPanel
    token={token}
    businesses={businesses}
  />
) : activeSection === "Business Profile" ? (
  <section className="profile-page">
    <div className="profile-intro">
      <span className="page-eyebrow">BUSINESS DETAILS</span>
      <h2>Business Profile</h2>
      <p>
        Manage the businesses whose financial performance you want
        OyejaAI to help you understand.
      </p>
    </div>

    <form onSubmit={handleCreateBusiness} className="profile-form">
      <div className="profile-form-heading">
        <div>
          <h3>Add a business</h3>
          <p>Enter the basic details for your business.</p>
        </div>
        <span className="profile-form-icon">
          <Building2 size={21} />
        </span>
      </div>

      <div className="profile-fields">
        <div className="profile-field">
          <label htmlFor="business-name">Business name</label>
          <input
            id="business-name"
            type="text"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="e.g. Royalty Stores"
            minLength={2}
            maxLength={150}
            required
          />
        </div>

        <div className="profile-field">
          <label htmlFor="business-type">Business type or industry</label>
          <input
            id="business-type"
            type="text"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            placeholder="e.g. Retail, Fashion, Agriculture"
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div className="profile-field">
          <label htmlFor="business-location">Business location</label>
          <input
            id="business-location"
            type="text"
            value={businessLocation}
            onChange={(event) => setBusinessLocation(event.target.value)}
            placeholder="e.g. Ado-Ekiti, Ekiti State"
            minLength={2}
            maxLength={150}
            required
          />
        </div>

        <div className="profile-field">
          <label htmlFor="business-currency">Currency</label>
          <select
            id="business-currency"
            value={businessCurrency}
            onChange={(event) => setBusinessCurrency(event.target.value)}
            required
          >
            <option value="NGN">NGN — Nigerian Naira</option>
            <option value="USD">USD — US Dollar</option>
            <option value="GBP">GBP — British Pound</option>
          </select>
        </div>
      </div>

      {businessesError && (
        <p role="alert" className="profile-error">
          {businessesError}
        </p>
      )}

      <div className="profile-form-actions">
        <button
          type="submit"
          className="profile-submit"
          disabled={isCreatingBusiness}
        >
          {isCreatingBusiness ? "Saving business..." : "Save business"}
        </button>
      </div>
    </form>

    <div className="profile-businesses">
      <div className="profile-section-heading">
        <div>
          <h3>Your businesses</h3>
          <p>Business profiles available in your workspace.</p>
        </div>
        <span className="profile-count">{businesses.length}</span>
      </div>

      {businessesLoading ? (
        <p className="profile-feedback">Loading your businesses...</p>
      ) : businesses.length === 0 ? (
        <div className="profile-empty-state">
          <Building2 size={25} />
          <strong>No businesses yet</strong>
          <p>Complete the form above to add your first business.</p>
        </div>
      ) : (
        <div className="profile-business-grid">
          {businesses.map((business) => (
            <article key={business.id} className="profile-business-card">
              <div className="profile-business-card-top">
                <span className="profile-business-icon">
                  <Building2 size={19} />
                </span>
                <span className="profile-business-currency">
                  {business.currency}
                </span>
              </div>
              <h4>{business.name}</h4>
              <p>{business.business_type}</p>
              <div className="profile-business-location">
                <span>{business.location}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  </section>
) : (
  <SectionPlaceholder
    section={activeSection}
    icon={ActiveIcon}
    onNavigate={navigateTo}
  />
)}

          <footer className="app-footer">
            <span>OyejaAI</span>
            <span>AI-powered business intelligence for Nigerian SMEs.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function getGreeting(section: Section): string {
  if (section === "Dashboard") return "Your business, in focus.";
  if (section === "Transactions") return "Manage your transactions.";
  if (section === "Business Analytics") return "Understand your performance.";
  if (section === "Financial Insights") return "Get clarity on your finances.";
  if (section === "AI Analysis") return "Ask better business questions.";
  if (section === "Business Profile") return "Tell us about your business.";
  return "Make your workspace yours.";
}


function DashboardHome({
  onNavigate,
  user,
  token,
  businesses,
}: {
  onNavigate: (section: Section) => void;
  user: User;
  token: string | null;
  businesses: Business[];
}) {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const business = businesses[0] ?? null;

  useEffect(() => {
    if (!token || !business) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummary(null);
      setIsLoading(false);
      setDashboardError("");
      return;
    }

    let cancelled = false;

    async function loadSummary() {
      setIsLoading(true);
      setDashboardError("");

      try {
        const result = await transactionApi.summary(business!.id, token!);

        if (!cancelled) {
          setSummary(result);
        }
      } catch (error) {
        if (!cancelled) {
          setSummary(null);
          setDashboardError(
            error instanceof Error
              ? error.message
              : "Unable to load your financial summary.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [token, business]);

  const currency = business?.currency || "NGN";

  function formatMoney(value: number | string) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  const hasTransactions = (summary?.transaction_count ?? 0) > 0;

  return (
    <>
      <section className="dashboard-context">
        <div className="dashboard-context-copy">
          <span className="dashboard-context-label">
            <Activity size={14} />
            BUSINESS OVERVIEW
          </span>
          <h2>
            Welcome back, {user.email.split("@")[0].replace(/^./, (character) => character.toUpperCase())}.
          </h2>
          <p>
            {business
              ? `Here is your financial snapshot for ${business.name}.`
              : "Set up your business profile to start tracking your financial performance."}
          </p>
        </div>

        <button
          className="dashboard-context-action"
          onClick={() =>
            onNavigate(business ? "Transactions" : "Business Profile")
          }
        >
          {business ? "View transactions" : "Set up business"}
          <ChevronRight size={16} />
        </button>
      </section>
      <div className="section-title-row">
        <div>
          <h2>Your overview</h2>
          <p>
            {business
              ? `Financial overview for ${business.name}.`
              : "Create a business profile to start tracking your performance."}
          </p>
        </div>
        <span className="data-status">
          <span
            className={`status-dot ${
              hasTransactions ? "" : "status-dot-muted"
            }`}
          />
          {isLoading
            ? "Loading business data"
            : dashboardError
              ? "Data unavailable"
              : hasTransactions
                ? "Connected to business data"
                : business
                  ? "Ready for transactions"
                  : "Awaiting business data"}
        </span>
      </div>

      {dashboardError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {dashboardError}
        </p>
      )}

      <section className="overview-grid">
        <OverviewCard
          icon={CircleDollarSign}
          label="Total income"
          value={
            isLoading
              ? "Loading..."
              : summary
                ? formatMoney(summary.total_income)
                : "—"
          }
          note="Based on recorded income"
        />
        <OverviewCard
          icon={Wallet}
          label="Total expenses"
          value={
            isLoading
              ? "Loading..."
              : summary
                ? formatMoney(summary.total_expenses)
                : "—"
          }
          note="Based on recorded expenses"
        />
        <OverviewCard
          icon={BarChart3}
          label="Net balance"
          value={
            isLoading
              ? "Loading..."
              : summary
                ? formatMoney(summary.net_balance)
                : "—"
          }
          note="Income minus expenses"
        />
        <OverviewCard
          icon={ReceiptText}
          label="Transactions"
          value={
            isLoading
              ? "Loading..."
              : summary
                ? String(summary.transaction_count)
                : "—"
          }
          note="Recorded business activity"
        />
      </section>

      <section className="dashboard-lower-grid">
        <div className="panel-card activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Getting started</h2>
              <p>Build the foundation for useful business insights.</p>
            </div>
            <span className="panel-heading-icon">
              <Activity size={19} />
            </span>
          </div>

          <div className="getting-started-list">
            <button
              className="getting-started-item"
              onClick={() => onNavigate("Business Profile")}
            >
              <span className="step-number">01</span>
              <span className="getting-started-copy">
                <strong>Manage your business profile</strong>
                <small>Add or update your business details.</small>
              </span>
              <ChevronRight size={18} />
            </button>
            <button
              className="getting-started-item"
              onClick={() => onNavigate("Transactions")}
            >
              <span className="step-number">02</span>
              <span className="getting-started-copy">
                <strong>Manage your transactions</strong>
                <small>Record and review income and expenses.</small>
              </span>
              <ChevronRight size={18} />
            </button>
            <button
              className="getting-started-item"
              onClick={() => onNavigate("Business Analytics")}
            >
              <span className="step-number">03</span>
              <span className="getting-started-copy">
                <strong>Explore business analytics</strong>
                <small>Understand patterns in your records.</small>
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="panel-card intelligence-panel">
          <div className="intelligence-icon">
            <BrainCircuit size={25} />
          </div>
          <span className="page-eyebrow">THE OYEJAAI APPROACH</span>
          <h2>More than a dashboard.</h2>
          <p>
            OyejaAI is being built to help business owners understand their
            numbers, recognise patterns, and make more informed decisions.
          </p>
          <button
            className="text-action"
            onClick={() => onNavigate("AI Analysis")}
          >
            Explore AI Analysis <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}


function OverviewCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="overview-card">
      <div className="overview-card-top">
        <span className="overview-icon">
          <Icon size={20} />
        </span>
        <span className="metric-placeholder">Live data</span>
      </div>
      <span className="overview-label">{label}</span>
      <strong className="overview-value">{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function SectionPlaceholder({
  section,
  icon: Icon,
  onNavigate,
}: {
  section: Section;
  icon: typeof LayoutDashboard;
  onNavigate: (section: Section) => void;
}) {
  const isSettings = section === "Settings";

  if (!isSettings) {
    return (
      <section className="module-empty-state">
        <div className="empty-state-icon">
          <Icon size={30} />
        </div>
        <span className="page-eyebrow">WORK IN PROGRESS</span>
        <h2>{section}</h2>
        <p>This section is not available yet.</p>
        <div className="empty-state-note">
          <span className="status-dot status-dot-muted" />
          This section has not been implemented yet.
        </div>
        <button
          className="welcome-action"
          onClick={() => onNavigate("Dashboard")}
        >
          Back to dashboard <ChevronRight size={17} />
        </button>
      </section>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <span className="page-eyebrow">WORKSPACE PREFERENCES</span>
          <h2>Settings</h2>
          <p>
            Review your workspace and account information. More
            configurable preferences will be added as they become available.
          </p>
        </div>
        <span className="settings-header-icon">
          <Icon size={25} />
        </span>
      </header>

      <section className="settings-section-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon">
            <Icon size={20} />
          </span>
          <div>
            <h3>Workspace overview</h3>
            <p>Core information about your OyejaAI workspace.</p>
          </div>
        </div>

        <div className="settings-information-row">
          <div>
            <strong>Workspace</strong>
            <p>Your OyejaAI business workspace</p>
          </div>
          <span className="settings-value-badge">Active workspace</span>
        </div>

        <div className="settings-information-row">
          <div>
            <strong>Business records</strong>
            <p>Your transactions and financial records remain in your workspace.</p>
          </div>
          <span className="settings-value-text">Unchanged</span>
        </div>

        <div className="settings-information-row">
          <div>
            <strong>Preferences</strong>
            <p>Editable workspace preferences are not available yet.</p>
          </div>
          <span className="settings-value-badge settings-value-badge-muted">
            Coming later
          </span>
        </div>
      </section>

      <section className="settings-section-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon">
            <Icon size={20} />
          </span>
          <div>
            <h3>Account and access</h3>
            <p>Manage your session through the existing sign-in flow.</p>
          </div>
        </div>

        <div className="settings-information-row">
          <div>
            <strong>Sign-in and security</strong>
            <p>
              Your existing authentication and session controls remain in place.
            </p>
          </div>
          <span className="settings-value-text">Protected session</span>
        </div>

        <p className="settings-security-note">
          For now, account changes and security preferences cannot be edited
          from this page. No account or authentication settings have been
          changed.
        </p>
      </section>

      <div className="settings-footer">
        <span className="status-dot status-dot-muted" />
        <p>
          This page is informational. It does not modify your business data,
          account details, or security settings.
        </p>
      </div>

      <button
        className="welcome-action settings-back-button"
        onClick={() => onNavigate("Dashboard")}
      >
        Back to dashboard <ChevronRight size={17} />
      </button>
    </div>
  );
}
export default Workspace;
