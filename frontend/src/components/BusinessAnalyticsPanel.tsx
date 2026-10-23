
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CircleDollarSign,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Wallet,
} from "lucide-react";

import {
  transactionApi,
} from "../lib/api";

import type {
  Business,
  BusinessInsightsResponse,
  CategoryBreakdownResponse,
  FinancialComparisonResponse,
  TransactionSummary,
} from "../lib/api";

type BusinessAnalyticsPanelProps = {
  token: string | null;
  businesses: Business[];
};

type AnalyticsData = {
  summary: TransactionSummary;
  categories: CategoryBreakdownResponse;
  comparison: FinancialComparisonResponse;
  insights: BusinessInsightsResponse;
};

function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function getMonthName(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

export default function BusinessAnalyticsPanel({
  token,
  businesses,
}: BusinessAnalyticsPanelProps) {
  const business = businesses[0] ?? null;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const currency = business?.currency || "NGN";

  function formatMoney(value: number | string): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(toNumber(value));
  }

  useEffect(() => {
    if (!token || !business) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      setIsLoading(false);
      setError("");
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setIsLoading(true);
      setError("");

      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const [summary, categories, comparison, insights] =
          await Promise.all([
            transactionApi.summary(business.id, token!),
            transactionApi.categoryBreakdown(business.id, token!),
            transactionApi.monthlyComparison(
              business.id,
              year,
              month,
              token!,
            ),
            transactionApi.insights(business.id, token!),
          ]);

        if (!cancelled) {
          setData({
            summary,
            categories,
            comparison,
            insights,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load business analytics.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [token, business]);

  if (!business) {
    return (
      <section className="analytics-empty panel-card">
        <BuildingIcon />
        <h2>Set up your business first</h2>
        <p>
          Create a business profile before viewing financial analytics.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="analytics-state panel-card">
        <LoaderCircle className="analytics-spinner" size={28} />
        <h2>Preparing your analytics</h2>
        <p>Loading financial summaries, categories, and insights.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="analytics-error panel-card" role="alert">
        <AlertCircle size={25} />
        <h2>We couldn't load your analytics</h2>
        <p>{error}</p>
        <button
          className="analytics-button"
          onClick={() => {
            setData(null);
            setIsLoading(true);
            setError("");
            window.location.reload();
          }}
        >
          <RefreshCw size={16} />
          Reload analytics
        </button>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, categories, comparison, insights } = data;

  const incomeCategories = categories.categories.filter(
    (item) => item.transaction_type === "income",
  );

  const expenseCategories = categories.categories.filter(
    (item) => item.transaction_type === "expense",
  );

  const largestCategoryAmount = Math.max(
    0,
    ...categories.categories.map((item) => toNumber(item.total_amount)),
  );

  const currentMonth = comparison.current_month;
  const previousMonth = comparison.previous_month;
  const changes = comparison.changes;

  const financialCards = [
    {
      label: "Total income",
      value: summary.total_income,
      note: "All recorded income",
      icon: CircleDollarSign,
      kind: "income",
    },
    {
      label: "Total expenses",
      value: summary.total_expenses,
      note: "All recorded expenses",
      icon: Wallet,
      kind: "expense",
    },
    {
      label: "Net balance",
      value: summary.net_balance,
      note: "Income minus expenses",
      icon: Activity,
      kind: "balance",
    },
    {
      label: "Transactions",
      value: summary.transaction_count,
      note: "Total records",
      icon: ReceiptText,
      kind: "count",
    },
  ];

  function renderCategoryList(
    items: CategoryBreakdownResponse["categories"],
    emptyMessage: string,
  ) {
    if (items.length === 0) {
      return <p className="analytics-muted">{emptyMessage}</p>;
    }

    return (
      <div className="analytics-category-list">
        {items
          .slice()
          .sort(
            (a, b) =>
              toNumber(b.total_amount) - toNumber(a.total_amount),
          )
          .map((item) => {
            const amount = toNumber(item.total_amount);
            const width =
              largestCategoryAmount > 0
                ? (amount / largestCategoryAmount) * 100
                : 0;

            return (
              <div
                className="analytics-category-item"
                key={`${item.transaction_type}-${item.category}`}
              >
                <div className="analytics-category-heading">
                  <span>{item.category}</span>
                  <strong>{formatMoney(item.total_amount)}</strong>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className={`analytics-bar-fill ${
                      item.transaction_type === "income"
                        ? "analytics-bar-income"
                        : "analytics-bar-expense"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="analytics-category-count">
                  {item.transaction_count}{" "}
                  {item.transaction_count === 1
                    ? "transaction"
                    : "transactions"}
                </span>
              </div>
            );
          })}
      </div>
    );
  }

  function renderChange(
    label: string,
    amount: number | string,
    percentage: number | string | null,
    inverseIsPositive = false,
  ) {
    const numericAmount = toNumber(amount);
    const positive = numericAmount > 0;
    const negative = numericAmount < 0;
    const favorable = inverseIsPositive ? negative : positive;
    const Icon = positive ? ArrowUpRight : ArrowDownRight;

    return (
      <div className="analytics-change-item" key={label}>
        <span>{label}</span>
        <strong
          className={
            positive || negative
              ? favorable
                ? "analytics-positive"
                : "analytics-negative"
              : ""
          }
        >
          {positive ? "+" : ""}
          {formatMoney(numericAmount)}
        </strong>
        <span className="analytics-change-percent">
          {percentage === null
            ? "No previous-month baseline"
            : `${toNumber(percentage) > 0 ? "+" : ""}${toNumber(
                percentage,
              ).toFixed(1)}% compared with last month`}
        </span>
        {numericAmount !== 0 && (
          <Icon
            size={17}
            className={
              positive || negative
                ? favorable
                  ? "analytics-positive"
                  : "analytics-negative"
                : ""
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <section className="analytics-intro">
        <div>
          <span className="analytics-eyebrow">
            <BarChart3 size={15} />
            BUSINESS PERFORMANCE
          </span>
          <h2>Business Analytics</h2>
          <p>
            A financial overview of {business.name}, based on your recorded
            transactions.
          </p>
        </div>
        <div className="analytics-business-chip">
          <span className="analytics-status-dot" />
          {business.name}
        </div>
      </section>

      <section className="analytics-metrics-grid">
        {financialCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className="analytics-metric-card" key={card.label}>
              <div className="analytics-metric-top">
                <span className={`analytics-metric-icon ${card.kind}`}>
                  <Icon size={20} />
                </span>
                <span className="analytics-metric-label">{card.label}</span>
              </div>
              <strong className="analytics-metric-value">
                {card.kind === "count"
                  ? String(card.value)
                  : formatMoney(card.value)}
              </strong>
              <span className="analytics-metric-note">{card.note}</span>
            </article>
          );
        })}
      </section>

      <section className="analytics-section-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>Income by category</h3>
              <p>Where your recorded income comes from.</p>
            </div>
            <span className="analytics-panel-icon income">
              <ArrowUpRight size={19} />
            </span>
          </div>
          {renderCategoryList(
            incomeCategories,
            "No income categories recorded yet.",
          )}
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>Expenses by category</h3>
              <p>How your recorded expenses are distributed.</p>
            </div>
            <span className="analytics-panel-icon expense">
              <ArrowDownRight size={19} />
            </span>
          </div>
          {renderCategoryList(
            expenseCategories,
            "No expense categories recorded yet.",
          )}
        </article>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div>
            <span className="analytics-eyebrow">MONTH-OVER-MONTH</span>
            <h3>Monthly performance comparison</h3>
            <p>
              {getMonthName(currentMonth.year, currentMonth.month)} compared
              with {getMonthName(previousMonth.year, previousMonth.month)}.
            </p>
          </div>
        </div>

        <div className="analytics-month-grid">
          <div className="analytics-month-card">
            <span>Current month</span>
            <strong>
              {formatMoney(currentMonth.net_balance)}
            </strong>
            <small>
              {currentMonth.transaction_count} transactions
            </small>
          </div>
          <div className="analytics-month-card">
            <span>Previous month</span>
            <strong>
              {formatMoney(previousMonth.net_balance)}
            </strong>
            <small>
              {previousMonth.transaction_count} transactions
            </small>
          </div>
        </div>

        <div className="analytics-changes-grid">
          {renderChange(
            "Income change",
            changes.income_change,
            changes.income_change_percent,
          )}
          {renderChange(
            "Expense change",
            changes.expenses_change,
            changes.expenses_change_percent,
            true,
          )}
          {renderChange(
            "Net balance change",
            changes.net_balance_change,
            changes.net_balance_change_percent,
          )}
        </div>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div>
            <span className="analytics-eyebrow">
              <BrainCircuit size={15} />
              FINANCIAL OBSERVATIONS
            </span>
            <h3>Business insights</h3>
            <p>
              Findings calculated from your recorded financial activity.
              These are rule-based observations, not AI-generated advice.
            </p>
          </div>
        </div>

        {insights.insights.length === 0 ? (
          <p className="analytics-muted">
            More transaction data is needed to produce useful observations.
          </p>
        ) : (
          <div className="analytics-insights-list">
            {insights.insights.map((insight, index) => (
              <article
                className={`analytics-insight ${insight.insight_type}`}
                key={`${insight.title}-${index}`}
              >
                <span className="analytics-insight-icon">
                  {insight.insight_type === "positive" ? (
                    <ArrowUpRight size={19} />
                  ) : insight.insight_type === "warning" ? (
                    <AlertCircle size={19} />
                  ) : (
                    <Activity size={19} />
                  )}
                </span>
                <div>
                  <h4>{insight.title}</h4>
                  <p>{insight.message}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="analytics-footnote">
        Analytics reflect the transactions currently recorded in OyejaAI.
        Incomplete records may affect these figures and observations.
      </p>
    </div>
  );
}

function BuildingIcon() {
  return (
    <span className="analytics-empty-icon">
      <BarChart3 size={26} />
    </span>
  );
}
