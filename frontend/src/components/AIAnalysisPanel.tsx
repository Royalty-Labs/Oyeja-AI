
import { useEffect, useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { aiAnalysisApi } from "../lib/api";
import type {
  Business,
  BusinessAIAnalysisResponse,
} from "../lib/api";

type AIAnalysisPanelProps = {
  token: string | null;
  businesses: Business[];
};

export default function AIAnalysisPanel({
  token,
  businesses,
}: AIAnalysisPanelProps) {
  const business = businesses[0] ?? null;

  const [data, setData] =
    useState<BusinessAIAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token || !business) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      setIsLoading(false);
      setError(
        !token
          ? "Your session token is missing. Please sign in again."
          : "",
      );
      return;
    }

    let cancelled = false;

    async function loadAnalysis() {
  if (!token) {
    setError("Your session token is missing. Please sign in again.");
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  setError("");
  setData(null);

  try {
    const result = await aiAnalysisApi.analyze(
      business.id,
      token,
    );

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to generate your AI analysis.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [token, business, reloadKey]);

  function retryAnalysis() {
    setReloadKey((current) => current + 1);
  }

  if (!business) {
    return (
      <section className="financial-insights-state panel-card">
        <BrainCircuit size={30} />
        <h2>Set up your business first</h2>
        <p>
          Create a business profile and record your transactions
          before requesting an AI-powered financial analysis.
        </p>
      </section>
    );
  }

  if (!token) {
    return (
      <section
        className="financial-insights-state panel-card"
        role="alert"
      >
        <AlertCircle size={28} />
        <h2>Your session has expired</h2>
        <p>Please sign in again to access AI Analysis.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="financial-insights-state panel-card">
        <LoaderCircle
          className="financial-insights-spinner"
          size={28}
        />
        <h2>Analysing your business data</h2>
        <p>
          OyejaAI is requesting an analysis based on your recorded
          financial information. This may take a little while.
        </p>
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
        <h2>AI analysis could not be generated</h2>
        <p>{error}</p>
        <button
          className="financial-insights-button"
          onClick={retryAnalysis}
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

  const analysisLines = data.analysis.split("\n");

  return (
    <div className="financial-insights-page">
      <section className="financial-insights-header">
        <div>
          <span className="financial-insights-eyebrow">
            <BrainCircuit size={15} />
            AI-POWERED BUSINESS INTELLIGENCE
          </span>
          <h2>AI Analysis</h2>
          <p>
            Evidence-based observations and practical next steps
            drawn from your recorded business transactions.
          </p>
        </div>

        <div className="financial-insights-business">
          <span className="financial-insights-status-dot" />
          {business.name}
        </div>
      </section>

      <section className="financial-insights-panel">
        <div className="financial-insights-panel-heading">
          <div>
            <span className="financial-insights-eyebrow">
              <Sparkles size={15} />
              YOUR BUSINESS REVIEW
            </span>
            <h3>What your records tell us</h3>
            <p>
              Generated using the AI model configured for OyejaAI.
            </p>
          </div>

          <button
            className="financial-insights-button"
            onClick={retryAnalysis}
          >
            <RefreshCw size={16} />
            Regenerate
          </button>
        </div>

        <div className="financial-insights-observations">
          {analysisLines.map((line, index) => {
            const trimmedLine = line.trim();

            if (!trimmedLine) {
              return (
                <div
                  key={`space-${index}`}
                  className="h-2"
                  aria-hidden="true"
                />
              );
            }

            const heading = trimmedLine.match(/^#{1,4}\s+(.+)$/);
            const boldHeading = trimmedLine.match(
              /^\*\*(.+)\*\*:?$/,
            );
            const bullet = trimmedLine.match(/^[-*]\s+(.+)$/);

            if (heading || boldHeading) {
              return (
                <h4
                  key={index}
                  className="text-base font-semibold"
                >
                  {(heading?.[1] ?? boldHeading?.[1] ?? "").replace(
                    /\*\*/g,
                    "",
                  )}
                </h4>
              );
            }

            if (bullet) {
              return (
                <p
                  key={index}
                  className="pl-4 text-sm leading-7"
                >
                  <span aria-hidden="true">• </span>
                  {bullet[1].replace(/\*\*/g, "")}
                </p>
              );
            }

            return (
              <p
                key={index}
                className="text-sm leading-7"
              >
                {trimmedLine.replace(/\*\*/g, "")}
              </p>
            );
          })}
        </div>

        <p className="financial-insights-disclaimer">
          This analysis is limited to the information recorded in
          OyejaAI. Net balance is not proof of accounting profit or
          verified cash available. Review the findings alongside
          your complete business records before making decisions.
        </p>
      </section>
    </div>
  );
}
