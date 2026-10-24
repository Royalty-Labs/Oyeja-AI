
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Business {
  id: number;
  name: string;
  business_type: string;
  location: string;
  currency: string;
  created_at: string;
}

export interface BusinessCreate {
  name: string;
  business_type: string;
  location: string;
  currency: string;
}

export interface Transaction {
  id: number;
  business_id: number;
  transaction_type: "income" | "expense";
  amount: string;
  category: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface TransactionCreate {
  business_id: number;
  transaction_type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
  occurred_at: string;
}

export interface TransactionSummary {
  business_id: number;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  transaction_count: number;
}



type FinancialNumber = number | string;

export interface CategoryBreakdownItem {
  transaction_type: "income" | "expense";
  category: string;
  total_amount: FinancialNumber;
  transaction_count: number;
}

export interface CategoryBreakdownResponse {
  business_id: number;
  categories: CategoryBreakdownItem[];
}

export interface MonthlyFinancialMetrics {
  year: number;
  month: number;
  total_income: FinancialNumber;
  total_expenses: FinancialNumber;
  net_balance: FinancialNumber;
  transaction_count: number;
}

export interface MonthlyFinancialChanges {
  income_change: FinancialNumber;
  expenses_change: FinancialNumber;
  net_balance_change: FinancialNumber;
  income_change_percent: FinancialNumber | null;
  expenses_change_percent: FinancialNumber | null;
  net_balance_change_percent: FinancialNumber | null;
}

export interface FinancialComparisonResponse {
  business_id: number;
  current_month: MonthlyFinancialMetrics;
  previous_month: MonthlyFinancialMetrics;
  changes: MonthlyFinancialChanges;
}

export interface BusinessInsight {
  title: string;
  message: string;
  insight_type: "positive" | "warning" | "information";
}

export interface BusinessInsightsResponse {
  business_id: number;
  total_income: FinancialNumber;
  total_expenses: FinancialNumber;
  net_balance: FinancialNumber;
  insights: BusinessInsight[];
}

export interface AIFinancialSummary {
  total_income: FinancialNumber;
  total_expenses: FinancialNumber;
  net_balance: FinancialNumber;
  transaction_count: number;
}

export interface AIDerivedFinancialMetrics {
  expense_to_income_percentage: number | null;
  income_transaction_count: number;
  expense_transaction_count: number;
}

export interface AICategoryEvidence {
  transaction_type: "income" | "expense";
  category: string;
  total_amount: FinancialNumber;
  transaction_count: number;
}

export interface BusinessAIAnalysisResponse {
  business_id: number;
  model: string;
  financial_summary: AIFinancialSummary;
  derived_metrics: AIDerivedFinancialMetrics;
  category_breakdown: AICategoryEvidence[];
  analysis: string;
}

interface ApiErrorResponse {
  detail?:
    | string
    | Array<{
        msg?: string;
      }>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to connect to OyejaAI. Check that your backend is running.",
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    try {
      const errorData =
        (await response.json()) as ApiErrorResponse;

      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        message = errorData.detail
          .map((item: { msg?: string }) => item.msg ?? "Invalid input")
          .join(", ");
      }
    } catch {
      // Keep the default error message if the response isn't JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register(email: string, password: string) {
    return apiRequest<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  getCurrentUser(token: string) {
    return apiRequest<User>("/auth/me", {}, token);
  },
};

export const businessApi = {
  list(token: string) {
    return apiRequest<Business[]>("/businesses/", {}, token);
  },

  create(data: BusinessCreate, token: string) {
    return apiRequest<Business>(
      "/businesses/",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
    );
  },
};

export const transactionApi = {
  list(businessId: number, token: string) {
    return apiRequest<Transaction[]>(
      `/transactions/business/${businessId}`,
      {},
      token,
    );
  },

  create(data: TransactionCreate, token: string) {
    return apiRequest<Transaction>(
      "/transactions/",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
    );
  },

  summary(businessId: number, token: string) {
    return apiRequest<TransactionSummary>(
      `/transactions/business/${businessId}/summary`,
      {},
      token,
    );
  },

  delete(transactionId: number, token: string) {
    return apiRequest<void>(
      `/transactions/${transactionId}`,
      { method: "DELETE" },
      token,
    );
  },


  categoryBreakdown(businessId: number, token: string) {
    return apiRequest<CategoryBreakdownResponse>(
      `/transactions/business/${businessId}/category-breakdown`,
      {},
      token,
    );
  },

  monthlyComparison(
    businessId: number,
    year: number,
    month: number,
    token: string,
  ) {
    return apiRequest<FinancialComparisonResponse>(
      `/transactions/business/${businessId}/monthly-comparison?year=${year}&month=${month}`,
      {},
      token,
    );
  },

  insights(businessId: number, token: string) {
    return apiRequest<BusinessInsightsResponse>(
      `/transactions/business/${businessId}/insights`,
      {},
      token,
    );
  },

};

export const aiAnalysisApi = {
  analyze(businessId: number, token: string) {
    return apiRequest<BusinessAIAnalysisResponse>(
      `/businesses/${businessId}/ai-analysis`,
      {},
      token,
    );
  },
};
