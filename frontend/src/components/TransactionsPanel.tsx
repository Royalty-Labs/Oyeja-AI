
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { transactionApi } from "../lib/api";
import type {
  Business,
  Transaction,
  TransactionSummary,
} from "../lib/api";

type TransactionsPanelProps = {
  token: string | null;
  businesses: Business[];
};

function getLocalDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function TransactionsPanel({
  token,
  businesses,
}: TransactionsPanelProps) {
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [transactionType, setTransactionType] =
    useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(getLocalDateTime());

  const selectedBusiness = businesses.find(
    (business) => String(business.id) === selectedBusinessId,
  );

  useEffect(() => {
    if (businesses.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedBusinessId("");
      return;
    }

    if (
      !businesses.some(
        (business) => String(business.id) === selectedBusinessId,
      )
    ) {
      setSelectedBusinessId(String(businesses[0].id));
    }
  }, [businesses, selectedBusinessId]);

  useEffect(() => {
    if (!selectedBusinessId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransactions([]);
      setSummary(null);
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTransactions() {
      setIsLoading(true);
      setError("");

      try {
        const businessId = Number(selectedBusinessId);

        const [transactionResults, summaryResult] = await Promise.all([
          transactionApi.list(businessId, token!),
          transactionApi.summary(businessId, token!),
        ]);

        if (!cancelled) {
          setTransactions(transactionResults);
          setSummary(summaryResult);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load transactions.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [token, selectedBusinessId, refreshKey]);

  function formatMoney(value: number | string) {
    const currency = selectedBusiness?.currency || "NGN";

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  async function handleCreateTransaction(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (!selectedBusinessId) {
      setError("Please select a business first.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await transactionApi.create(
        {
          business_id: Number(selectedBusinessId),
          transaction_type: transactionType,
          amount: Number(amount),
          category: category.trim(),
          description: description.trim() || null,
          occurred_at: new Date(occurredAt).toISOString(),
        },
        token,
      );

      setAmount("");
      setCategory("");
      setDescription("");
      setOccurredAt(getLocalDateTime());
      setSuccess("Transaction recorded successfully.");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the transaction.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTransaction(transactionId: number) {
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await transactionApi.delete(transactionId, token);
      setSuccess("Transaction deleted.");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the transaction.",
      );
    }
  }

  if (businesses.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <div className="rounded-xl border border-dashed p-6">
          <h3 className="font-semibold">Add a business first</h3>
          <p className="mt-2 text-sm text-gray-500">
            Open Business Profile and create a business before recording
            financial transactions.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="transactions-page space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <p className="mt-2 text-sm text-gray-500">
          Record and review your business income and expenses.
        </p>
      </div>

      <div className="transactions-business-picker max-w-xl">
        <label
          htmlFor="transaction-business"
          className="mb-1 block text-sm font-medium"
        >
          Select business
        </label>
        <select
          id="transaction-business"
          value={selectedBusinessId}
          onChange={(event) => {
            setSelectedBusinessId(event.target.value);
            setSuccess("");
          }}
          required
          className="w-full rounded-lg border px-3 py-2"
        >
          {businesses.map((business) => (
            <option key={business.id} value={String(business.id)}>
              {business.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <div className="transactions-summary-grid grid gap-4 sm:grid-cols-3">
        <article className="transaction-summary-card rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total income</p>
          <p className="mt-2 text-xl font-semibold">
            {summary ? formatMoney(summary.total_income) : "—"}
          </p>
        </article>

        <article className="transaction-summary-card rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total expenses</p>
          <p className="mt-2 text-xl font-semibold">
            {summary ? formatMoney(summary.total_expenses) : "—"}
          </p>
        </article>

        <article className="transaction-summary-card rounded-xl border p-5">
          <p className="text-sm text-gray-500">Net balance</p>
          <p className="mt-2 text-xl font-semibold">
            {summary ? formatMoney(summary.net_balance) : "—"}
          </p>
        </article>
      </div>

      <form
        onSubmit={handleCreateTransaction}
        className="transaction-form space-y-4 rounded-xl border p-5"
      >
        <h3 className="transaction-form-title text-lg font-semibold">Record a transaction</h3>

        <div>
          <label
            htmlFor="transaction-type"
            className="mb-1 block text-sm font-medium"
          >
            Transaction type
          </label>
          <select
            id="transaction-type"
            value={transactionType}
            onChange={(event) =>
              setTransactionType(event.target.value as "income" | "expense")
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="income">Income — money received</option>
            <option value="expense">Expense — money spent</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="transaction-amount"
            className="mb-1 block text-sm font-medium"
          >
            Amount ({selectedBusiness?.currency || "NGN"})
          </label>
          <input
            id="transaction-amount"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            min="0.01"
            step="0.01"
            required
            placeholder="e.g. 15000"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="transaction-category"
            className="mb-1 block text-sm font-medium"
          >
            Category
          </label>
          <input
            id="transaction-category"
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            minLength={2}
            maxLength={100}
            required
            placeholder="e.g. Sales, Stock, Transport"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="transaction-description"
            className="mb-1 block text-sm font-medium"
          >
            Description (optional)
          </label>
          <input
            id="transaction-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            placeholder="What was this transaction for?"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="transaction-date"
            className="mb-1 block text-sm font-medium"
          >
            Date and time
          </label>
          <input
            id="transaction-date"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving || !selectedBusinessId}
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving transaction..." : "Save transaction"}
        </button>
      </form>

      <div className="transaction-history-section space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Transaction history</h3>
          <p className="mt-1 text-sm text-gray-500">
            {summary
              ? `${summary.transaction_count} recorded transaction(s)`
              : "Your recorded financial activity"}
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-gray-500">
            No transactions have been recorded for this business yet.
          </div>
        ) : (
          <div className="transaction-history-list space-y-3">
            {transactions.map((transaction) => (
              <article
                key={transaction.id}
                className="transaction-history-item flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{transaction.category}</p>
                  <p className="mt-1 break-words text-sm text-gray-500">
                    {transaction.description || "No description"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(transaction.occurred_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="transaction-history-amount font-semibold">
                      {transaction.transaction_type === "income" ? "+" : "−"}
                      {formatMoney(transaction.amount)}
                    </p>
                    <p className="transaction-history-type text-xs capitalize text-gray-500">
                      {transaction.transaction_type}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteTransaction(transaction.id);
                    }}
                    className="transaction-delete-button rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    aria-label={`Delete ${transaction.category} transaction`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default TransactionsPanel;
