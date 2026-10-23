
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
  <section className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold">Business Profile</h2>
      <p className="mt-2 text-sm text-gray-500">
        Add and manage the businesses you want OyejaAI to analyse.
      </p>
    </div>

    <form
      onSubmit={handleCreateBusiness}
      className="space-y-4 rounded-xl border p-5"
    >
      <h3 className="text-lg font-semibold">Add a business</h3>

      <div>
        <label htmlFor="business-name" className="mb-1 block text-sm font-medium">
          Business name
        </label>
        <input
          id="business-name"
          type="text"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="e.g. Royalty Stores"
          minLength={2}
          maxLength={150}
          required
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="business-type" className="mb-1 block text-sm font-medium">
          Business type or industry
        </label>
        <input
          id="business-type"
          type="text"
          value={businessType}
          onChange={(event) => setBusinessType(event.target.value)}
          placeholder="e.g. Retail, Fashion, Agriculture"
          minLength={2}
          maxLength={100}
          required
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="business-location" className="mb-1 block text-sm font-medium">
          Business location
        </label>
        <input
          id="business-location"
          type="text"
          value={businessLocation}
          onChange={(event) => setBusinessLocation(event.target.value)}
          placeholder="e.g. Ado-Ekiti, Ekiti State"
          minLength={2}
          maxLength={150}
          required
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="business-currency" className="mb-1 block text-sm font-medium">
          Currency
        </label>
        <select
          id="business-currency"
          value={businessCurrency}
          onChange={(event) => setBusinessCurrency(event.target.value)}
          required
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="NGN">NGN — Nigerian Naira</option>
          <option value="USD">USD — US Dollar</option>
          <option value="GBP">GBP — British Pound</option>
        </select>
      </div>

      {businessesError && (
        <p role="alert" className="text-sm text-red-600">
          {businessesError}
        </p>
      )}

      <button
        type="submit"
        disabled={isCreatingBusiness}
        className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCreatingBusiness ? "Saving business..." : "Save business"}
      </button>
    </form>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Your businesses</h3>

      {businessesLoading ? (
        <p className="text-sm text-gray-500">Loading your businesses...</p>
      ) : businesses.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-gray-500">
          No businesses yet. Complete the form above to get started.
        </p>
      ) : (
        <div className="grid gap-4">
          {businesses.map((business) => (
            <article
              key={business.id}
              className="rounded-xl border p-5"
            >
              <h4 className="font-semibold">{business.name}</h4>
              <p className="mt-2 text-sm text-gray-500">
                {business.business_type}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {business.location}
              </p>
              <p className="mt-3 text-sm">
                Currency: {business.currency}
              </p>
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
      <section className="dashboard-welcome">
        <div className="welcome-copy">
          <span className="welcome-badge">
            <Sparkles size={14} />
            YOUR BUSINESS INTELLIGENCE SPACE
          </span>
          <h2>Welcome to OyejaAI</h2>
          <p>
            {business
              ? `Your workspace is connected to ${business.name}. Review your business performance and keep your records up to date.`
              : `Your account is ready, ${user.email}. Set up your business to start bringing your data into one place.`}
          </p>
          <button
            className="welcome-action"
            onClick={() =>
              onNavigate(business ? "Transactions" : "Business Profile")
            }
          >
            {business ? "View transactions" : "Set up your business"}
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="welcome-illustration" aria-hidden="true">
          <div className="illustration-circle illustration-circle-one" />
          <div className="illustration-circle illustration-circle-two" />
          <div className="illustration-panel">
            <Activity size={25} />
            <span>Business clarity</span>
            <strong>Starts with your data.</strong>
            <div className="illustration-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
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
  const descriptions: Record<Section, string> = {
    Dashboard: "",
    Transactions:
      "This section will let you record and review income and expenses. We will connect it to your existing transactions API before showing business records here.",
    "Business Analytics":
      "This section will turn recorded business activity into performance summaries, category breakdowns, and meaningful comparisons.",
    "Financial Insights":
      "This section will help you understand revenue, expenses, cash flow, and financial patterns using your actual business data.",
    "AI Analysis":
      "This section will provide AI-assisted answers and recommendations grounded in your business records, rather than generic responses.",
    "Business Profile":
      "This section will collect your business name, industry, location, currency, and other context needed to make your analysis relevant.",
    Settings:
      "This section will eventually hold your account preferences and workspace settings.",
  };

  return (
    <section className="module-empty-state">
      <div className="empty-state-icon">
        <Icon size={30} />
      </div>
      <span className="page-eyebrow">WORK IN PROGRESS</span>
      <h2>{section}</h2>
      <p>{descriptions[section]}</p>
      <div className="empty-state-note">
        <span className="status-dot status-dot-muted" />
        This module is not connected yet. No business data or analysis is being
        displayed here.
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

export default Workspace;
