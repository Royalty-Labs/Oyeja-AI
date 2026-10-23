
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
            "OYEJA_AI environment variables."
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
        "reasoning_effort": "low",
        "max_tokens": 400,
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
        response = None

        for attempt in range(3):
            try:
                response = httpx.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=90.0,
                )
                response.raise_for_status()
                break

            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in (429, 500, 502, 503, 504):
                    raise
                if attempt == 2:
                    raise
                import time
                time.sleep(2 ** attempt)

            except httpx.TimeoutException:
                if attempt == 2:
                    raise
                import time
                time.sleep(2 ** attempt)

        if response is None:
            raise RuntimeError("The AI provider returned no response.")

        result = response.json()
        analysis = result["choices"][0]["message"]["content"]

        if not isinstance(analysis, str) or not analysis.strip():
            raise RuntimeError(
                "The AI provider returned an empty analysis."
            )

        analysis = analysis.strip()

        # Filter unsupported claims that recorded transactions prove profit.
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

            if (
                mentions_profit
                and asserts_profit
                and not contains_caveat
            ):
                if not accuracy_warning_added:
                    safe_lines.append(
                        "**Financial interpretation:** Recorded income "
                        "minus recorded expenses gives a net balance. "
                        "This alone does not establish accounting profit."
                    )
                    accuracy_warning_added = True
                continue

            safe_lines.append(line)

        return "\n".join(safe_lines).strip()

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code

        try:
            error_data = exc.response.json()
            provider_error = error_data.get("error", {})
            error_message = (
                provider_error.get("message", "")
                if isinstance(provider_error, dict)
                else ""
            )
        except (ValueError, AttributeError):
            error_message = ""

        print(
            f"AI provider returned HTTP {status_code}: "
            f"{error_message[:300]}"
        )

        raise RuntimeError(
            f"The AI provider returned HTTP {status_code}. "
            "Check the backend logs for details."
        ) from exc

    except httpx.HTTPError as exc:
        print(
            f"AI provider connection error: {type(exc).__name__}"
        )

        raise RuntimeError(
            "The AI provider request failed. Could not connect to "
            "the configured AI provider. Check the backend logs "
            "and provider URL."
        ) from exc

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise RuntimeError(
            "The AI provider returned an unexpected response."
        ) from exc
