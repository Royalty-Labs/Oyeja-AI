import re
import httpx

from app.core.config import settings


def generate_business_analysis(
    business_context: dict,
) -> str:
    """Generate an evidence-based analysis of business finances."""

    api_key = settings.OYEJA_AI_API_KEY.strip()
    base_url = settings.OYEJA_AI_BASE_URL.strip().rstrip("/")
    model = settings.OYEJA_AI_MODEL.strip()

    if not api_key or not base_url or not model:
        raise RuntimeError(
            "AI configuration is incomplete. Check the three "
            "OYEJA_AI settings in the root .env file."
        )

    system_prompt = """
You are Oyeja AI, a business intelligence assistant
supporting small and medium-sized businesses in Nigeria.

Analyze only the financial information provided to you.

Your responsibilities:
1. Explain recorded income, expenses, and net balance.
2. Identify patterns directly supported by the transaction data.
3. Recommend practical actions relevant to the available evidence.
4. Explain the limitations of incomplete transaction history.
5. Use the business's configured currency.

Mandatory financial accuracy rules:
- Net balance means recorded income minus recorded expenses.
- Never describe net balance as net profit or proof of profitability.
- Never describe net balance as verified cash available.
- Recorded income does not necessarily equal collected cash.
- Recorded expenses may not include every business cost.
- Do not infer sales trends from a single income transaction.
- Do not infer recurring expenses from a single expense transaction.
- Do not invent customers, transactions, figures, or market conditions.
- Distinguish recorded facts from interpretations and recommendations.
- When the evidence is insufficient, explicitly say so.
- Do not recommend expansion or spending without supporting evidence.
- Always complete the response, including the limitations section.

Keep the analysis concise, evidence-based, and actionable.
- Use derived_metrics when explaining calculated ratios.
- Explain expense-to-income percentage as recorded expenses
  relative to recorded income, not as a profit margin.
- Do not claim growth, decline, or recurring patterns without
  sufficient historical data.
- Avoid unsupported recommendations about expansion or marketing.
- Prioritize insights that can be traced to the supplied data.
- Keep the response under 120 words.
- Use only these sections: Financial Summary, Findings,
  Next Steps, and Limitations.
- Do not repeat the financial figures unnecessarily.
- Do not add a conclusion.
- Mention only the most important findings.
- Never describe net balance as established accounting profit.
- Never describe net balance as verified cash available.
- If historical data is insufficient, state that clearly.
- Do not recommend marketing, expansion, price changes, or
  increased spending unless the supplied data supports the recommendation.
- When evidence is limited, prioritize improving record quality
  and collecting more data before making strategic recommendations.
"""

    payload = {
        "model": model,
        "temperature": 0.2,
        "max_tokens": 220,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": (
                    "Analyze this business's financial data and "
                    "provide evidence-based findings and practical "
                    "next steps. Keep the analysis concise.\n\n"
                    f"Business data: {business_context}"
                ),
            },
        ],
    }

    try:
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=300.0,
        )
        response.raise_for_status()

        result = response.json()
        analysis = result["choices"][0]["message"]["content"]

        if not isinstance(analysis, str) or not analysis.strip():
            raise RuntimeError("The AI provider returned an empty analysis.")

        analysis = analysis.strip()

        # Remove unsupported claims that recorded transactions prove profit.
        safe_lines = []
        accuracy_warning_added = False

        for line in analysis.splitlines():
            lower_line = line.lower()

            mentions_profit = re.search(
                r"\bprofit(?:s|able|ability)?\b",
                lower_line,
            )

            contains_caveat = any(
                phrase in lower_line
                for phrase in (
                    "not proof",
                    "does not establish",
                    "do not establish",
                    "cannot establish",
                    "insufficient evidence",
                    "not enough evidence",
                    "not necessarily",
                )
            )

            asserts_profit = any(
                phrase in lower_line
                for phrase in (
                    "indicating",
                    "indicates",
                    "shown a",
                    "showing a",
                    "demonstrates",
                    "resulting in a profit",
                    "generated a profit",
                    "earned a profit",
                    "profit of",
                )
            )

            if mentions_profit and asserts_profit and not contains_caveat:
                if not accuracy_warning_added:
                    safe_lines.append(
                        "**Financial interpretation:** Recorded income "
                        "minus recorded expenses gives a net balance. "
                        "This alone does not establish accounting profit."
                    )
                    accuracy_warning_added = True
                continue

            safe_lines.append(line)

        analysis = "\n".join(safe_lines).strip()

        return (
            analysis
            + "\n\n### Financial Accuracy Note\n"
            + "Net balance is recorded income minus recorded expenses. "
            + "It is not, by itself, proof of accounting profit or "
            + "verified cash available. The analysis is limited to "
            + "the transactions recorded in Oyeja AI."
        )

    except httpx.HTTPError as exc:
        raise RuntimeError(
            "The AI provider request failed. Check that the local "
            "model server is running and the URL is correct."
        ) from exc

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise RuntimeError("The AI provider returned an unexpected response.") from exc
