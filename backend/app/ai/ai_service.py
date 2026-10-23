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
You are Oyeja AI, a careful financial business intelligence assistant
for small businesses in Nigeria.

Analyze only the business data supplied in the user message.
Use the configured currency and the four headings below:
Financial Summary, Findings, Next Steps, Limitations.

STRICT RULES:
- Report financial figures as provided; do not invent or alter them.
- Net balance means recorded income minus recorded expenses.
- Never equate net balance with accounting profit or available cash.
- Expense-to-income percentage is not a profit margin.
- Do not call a business financially healthy, successful, struggling,
  or profitable without sufficient supporting evidence.
- Do not describe expenses as significant, excessive, or avoidable
  without a relevant benchmark or other supporting evidence.
- A largest expense category is a factual observation, not proof
  that the expense should be reduced.
- Do not recommend marketing, expanding products, cutting costs,
  or increasing sales unless the supplied data supports that action.
- When evidence is insufficient, explicitly say so.
- Prefer practical verification steps, such as checking whether
  all transactions for the period have been recorded.
- Distinguish recorded facts from interpretations and uncertainties.
- Never invent trends, causes, benchmarks, or missing information.
- Keep the complete response under 100 words.
- Use concise bullet points under all four headings.
- Make recommendations specific, proportionate, and evidence-based.
    """



    payload = {
        "model": model,
        "temperature": 0.2,
        "max_tokens": 200,
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
        return analysis
    except httpx.HTTPError as exc:
        raise RuntimeError(
            "The AI provider request failed. Check that the local "
            "model server is running and the URL is correct."
        ) from exc

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise RuntimeError("The AI provider returned an unexpected response.") from exc
