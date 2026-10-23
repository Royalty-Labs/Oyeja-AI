
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { transactionApi } from "../lib/api";

import type {
  Business,
  BusinessInsightsResponse,
  CategoryBreakdownResponse,
  FinancialComparisonResponse,
  TransactionSummary,
} from "../lib/api";

type FinancialInsightsPanelProps = {
  token: string | null;
  businesses: Business[];
};

type FinancialInsightsData = {
  summary: TransactionSummary;
  categories: CategoryBreakdownResponse;
  comparison: FinancialComparisonResponse;
  insights: BusinessInsightsResponse;
};

function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

export default function FinancialInsightsPanel({
  token,
  businesses,
}: FinancialInsightsPanelProps) {
  const business = businesses[0] ?? null;

  const [data, setData] = useState<FinancialInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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

    async function loadFinancialInsights() {
      setIsLoading(true);
      setError("");

      try {
        const now = new Date();

        const [summary, categories, comparison, insights] =
          await Promise.all([
            transactionApi.summary(business.id, token!),
            transactionApi.categoryBreakdown(business.id, token!),
            transactionApi.monthlyComparison(
              business.id,
              now.getFullYear(),
              now.getMonth() + 1,
              token!,
            ),
            transactionApi.insights(business.id, token!),
          ]);

        if (!cancelled) {
          setData({ summary, categories, comparison, insights });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load financial insights.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFinancialInsights();

    return () => {
      cancelled = true;
    };
  }, [token, business, reloadKey]);

  if (!business) {
    return (
      <section className="financial-insights-state panel-card">
        <CircleDollarSign size={30} />
        <h2>Set up your business first</h2>
        <p>
          Create a business profile and record transactions to start
          reviewing your financial position.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="financial-insights-state panel-card">
        <LoaderCircle className="financial-insights-spinner" size={28} />
        <h2>Reviewing your financial activity</h2>
        <p>Loading your recorded figures and financial observations.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="financial-insights-state panel-card"
        role="alert"
      >
        <AlertCircle size={28} />
        <h2>Financial insights could not load</h2>
        <p>{error}</p>
        <button
          className="financial-insights-button"
          onClick={() => setReloadKey((current) => current + 1)}
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, categories, comparison, insights } = data;

  const totalIncome = toNumber(summary.total_income);
  const totalExpenses = toNumber(summary.total_expenses);
  const netBalance = toNumber(summary.net_balance);

  const expenseToIncomePercent =
    totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : null;

  const expenseCategories = categories.categories
    .filter((item) => item.transaction_type === "expense")
    .sort(
      (a, b) => toNumber(b.total_amount) - toNumber(a.total_amount),
    );

  const largestExpenseCategory = expenseCategories[0] ?? null;

  const currentMonth = comparison.current_month;
  const previousMonth = comparison.previous_month;
  const changes = comparison.changes;

  const hasRecordedTransactions = summary.transaction_count > 0;

  const financialPosition =
    !hasRecordedTransactions
      ? "Awaiting transactions"
      : netBalance > 0
        ? "Positive recorded balance"
        : netBalance < 0
          ? "Expenses exceed income"
          : "Income and expenses are equal";

  const financialPositionClass =
    !hasRecordedTransactions
      ? "neutral"
      : netBalance > 0
        ? "positive"
        : netBalance < 0
          ? "warning"
          : "neutral";

  function renderChange(
    label: string,
    amount: number | string,
    percentage: number | string | null,
    expenses = false,
  ) {
    const numericAmount = toNumber(amount);
    const isPositive = numericAmount > 0;
    const isNegative = numericAmount < 0;
    const favorable = expenses ? isNegative : isPositive;

    return (
      <article className="financial-insights-change" key={label}>
        <span className="financial-insights-change-label">{label}</span>
        <strong
          className={
            numericAmount === 0
              ? ""
              : favorable
                ? "financial-insights-positive"
                : "financial-insights-warning-text"
          }
        >
          {isPositive ? "+" : ""}
          {formatMoney(numericAmount)}
        </strong>
        <span className="financial-insights-change-note">
          {percentage === null
            ? "No previous-month baseline"
            : `${toNumber(percentage) > 0 ? "+" : ""}${toNumber(
                percentage,
              ).toFixed(1)}% compared with last month`}
        </span>
      </article>
    );
  }

  return (
    <div className="financial-insights-page">
      <section className="financial-insights-header">
        <div>
          <span className="financial-insights-eyebrow">
            <BrainCircuit size={15} />
            FINANCIAL REVIEW
          </span>
          <h2>Financial Insights</h2>
          <p>
            Understand what your recorded business transactions reveal
            about your current financial position.
          </p>
        </div>

        <div className="financial-insights-business">
          <span className="financial-insights-status-dot" />
          {business.name}
        </div>
      </section>

      <section
        className={`financial-insights-position ${financialPositionClass}`}
      >
        <div className="financial-insights-position-icon">
          {financialPositionClass === "positive" ? (
            <CheckCircle2 size={23} />
          ) : financialPositionClass === "warning" ? (
            <AlertCircle size={23} />
          ) : (
            <Activity size={23} />
          )}
        </div>
        <div>
          <span className="financial-insights-position-label">
            Recorded financial position
          </span>
          <h3>{financialPosition}</h3>
          <p>
            {hasRecordedTransactions
              ? `Based on ${summary.transaction_count} recorded ${
                  summary.transaction_count === 1
                    ? "transaction"
                    : "transactions"
                }. This does not account for transactions that have not been entered.`
              : "Record your business income and expenses to generate a financial review."}
          </p>
        </div>
      </section>

      <section className="financial-insights-metric-grid">
        <article className="financial-insights-metric">
          <span className="financial-insights-metric-icon income">
            <ArrowUpRight size={20} />
          </span>
          <span className="financial-insights-metric-label">
            Total income
          </span>
          <strong>{formatMoney(summary.total_income)}</strong>
          <small>All recorded income</small>
        </article>

        <article className="financial-insights-metric">
          <span className="financial-insights-metric-icon expense">
            <ArrowDownRight size={20} />
          </span>
          <span className="financial-insights-metric-label">
            Total expenses
          </span>
          <strong>{formatMoney(summary.total_expenses)}</strong>
          <small>All recorded expenses</small>
        </article>

        <article className="financial-insights-metric">
          <span className="financial-insights-metric-icon balance">
            <Wallet size={20} />
          </span>
          <span className="financial-insights-metric-label">
            Net balance
          </span>
          <strong>{formatMoney(summary.net_balance)}</strong>
          <small>Income minus expenses</small>
        </article>
      </section>

      <section className="financial-insights-content-grid">
        <article className="financial-insights-panel">
          <div className="financial-insights-panel-heading">
            <div>
              <h3>Income and spending relationship</h3>
              <p>How recorded expenses compare with recorded income.</p>
            </div>
          </div>

          {expenseToIncomePercent === null ? (
            <div className="financial-insights-empty-note">
              <p>
                Record income to calculate the relationship between income
                and expenses.
              </p>
            </div>
          ) : (
            <>
              <div className="financial-insights-ratio">
                <strong>{expenseToIncomePercent.toFixed(1)}%</strong>
                <span>of recorded income is matched by expenses</span>
              </div>

              <div className="financial-insights-ratio-track">
                <div
                  className={`financial-insights-ratio-fill ${
                    expenseToIncomePercent > 100 ? "over-budget" : ""
                  }`}
                  style={{
                    width: `${Math.min(expenseToIncomePercent, 100)}%`,
                  }}
                />
              </div>

              <div className="financial-insights-ratio-legend">
                <span>
                  <i className="income-dot" />
                  Income: {formatMoney(summary.total_income)}
                </span>
                <span>
                  <i className="expense-dot" />
                  Expenses: {formatMoney(summary.total_expenses)}
                </span>
              </div>

              <p className="financial-insights-explanation">
                {expenseToIncomePercent > 100
                  ? "Recorded expenses are greater than recorded income. Review your transactions and check whether additional income has not yet been recorded."
                  : expenseToIncomePercent === 100
                    ? "Recorded expenses equal recorded income, leaving no difference between the two totals."
                    : "Recorded income exceeds recorded expenses. The remaining difference is your recorded net balance, before any unrecorded costs or obligations."}
              </p>
            </>
          )}
        </article>

        <article className="financial-insights-panel">
          <div className="financial-insights-panel-heading">
            <div>
              <h3>Largest expense category</h3>
              <p>The category with the highest recorded expense total.</p>
            </div>
          </div>

          {largestExpenseCategory ? (
            <div className="financial-insights-largest-category">
              <span className="financial-insights-category-icon">
                <Wallet size={22} />
              </span>
              <div>
                <strong>{largestExpenseCategory.category}</strong>
                <p>
                  {largestExpenseCategory.transaction_count}{" "}
                  {largestExpenseCategory.transaction_count === 1
                    ? "transaction"
                    : "transactions"}
                </p>
              </div>
              <strong className="financial-insights-category-total">
                {formatMoney(largestExpenseCategory.total_amount)}
              </strong>
            </div>
          ) : (
            <div className="financial-insights-empty-note">
              <p>
                No expense categories are available yet. Record an expense
                to identify your largest category.
              </p>
            </div>
          )}

          {largestExpenseCategory && totalExpenses > 0 && (
            <p className="financial-insights-explanation">
              This category represents{" "}
              {(
                (toNumber(largestExpenseCategory.total_amount) /
                  totalExpenses) *
                100
              ).toFixed(1)}
              % of your recorded expenses. This identifies where spending
              is concentrated; it does not automatically mean the expense
              is unnecessary.
            </p>
          )}
        </article>
      </section>

      <section className="financial-insights-panel">
        <div className="financial-insights-panel-heading">
          <div>
            <span className="financial-insights-eyebrow">
              MONTHLY COMPARISON
            </span>
            <h3>Are your finances changing?</h3>
            <p>
              {formatMonth(currentMonth.year, currentMonth.month)} compared
              with {formatMonth(previousMonth.year, previousMonth.month)}.
            </p>
          </div>
        </div>

        <div className="financial-insights-months">
          <div>
            <span>Current month net balance</span>
            <strong>{formatMoney(currentMonth.net_balance)}</strong>
            <small>{currentMonth.transaction_count} transactions</small>
          </div>
          <div>
            <span>Previous month net balance</span>
            <strong>{formatMoney(previousMonth.net_balance)}</strong>
            <small>{previousMonth.transaction_count} transactions</small>
          </div>
        </div>

        <div className="financial-insights-change-grid">
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

      <section className="financial-insights-panel">
        <div className="financial-insights-panel-heading">
          <div>
            <span className="financial-insights-eyebrow">
              <BrainCircuit size={15} />
              RECORDED-DATA OBSERVATIONS
            </span>
            <h3>What stands out</h3>
            <p>
              These observations are generated by existing financial rules,
              not by a generative AI model.
            </p>
          </div>
        </div>

        {insights.insights.length === 0 ? (
          <div className="financial-insights-empty-note">
            <p>
              There are no observations to display yet. More recorded
              financial activity may reveal useful patterns.
            </p>
          </div>
        ) : (
          <div className="financial-insights-observations">
            {insights.insights.map((insight, index) => (
              <article
                className={`financial-insights-observation ${insight.insight_type}`}
                key={`${insight.title}-${index}`}
              >
                <span className="financial-insights-observation-icon">
                  {insight.insight_type === "positive" ? (
                    <CheckCircle2 size={19} />
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

      <p className="financial-insights-disclaimer">
        This review is based on transactions currently recorded in OyejaAI.
        It is intended to support business monitoring, not replace
        professional accounting advice. Missing or incorrectly recorded
        transactions can affect the results.
      </p>
    </div>
  );
}
