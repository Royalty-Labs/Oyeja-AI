import re
import time

import httpx

from google import genai
from google.genai import errors, types

from app.core.config import settings


def generate_business_analysis(business_context: dict) -> str:
    """Generate an evidence-based analysis of business finances."""

    api_key = settings.OYEJA_AI_API_KEY.strip()
    model = settings.OYEJA_AI_MODEL.strip()

    if not api_key or not model:
        raise RuntimeError(
            "AI configuration is incomplete. Check OYEJA_AI_API_KEY "
            "and OYEJA_AI_MODEL."
        )

    system_prompt = """
You are Oyeja AI, a careful financial business intelligence assistant
for small businesses in Nigeria.

Analyze only the business data supplied in the user message.
Use the configured currency and exactly these four headings:
### Financial Summary
### Findings
### Next Steps
### Limitations

STRICT RULES:
- Report financial figures as provided; do not invent or alter them.
- Net balance means recorded income minus recorded expenses.
- Never equate net balance with accounting profit or available cash.
- Do not claim a business is profitable based only on net balance.
- Ground findings and recommendations in the supplied data.
- State when the data is insufficient to support a conclusion.
- Do not invent transactions, trends, causes, forecasts, or figures.
- Keep the answer concise, under 150 words, and use bullet points.
"""

    prompt = (
        f"{system_prompt}\n\n"
        "Analyze this business context:\n"
        f"{business_context}"
    )

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=45000),
    )

    try:
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=1200,
                    ),
                )

                raw_text = response.text or ""
                candidates = getattr(response, "candidates", None) or []
                finish_reason = (
                    getattr(candidates[0], "finish_reason", None)
                    if candidates
                    else "no_candidate"
                )
                prompt_feedback = getattr(
                    response, "prompt_feedback", None
                )
                block_reason = getattr(
                    prompt_feedback, "block_reason", None
                )

                print(
                    "Gemini response diagnostics: "
                    f"finish_reason={finish_reason}, "
                    f"candidate_count={len(candidates)}, "
                    f"text_length={len(raw_text)}, "
                    f"block_reason={block_reason}"
                )

                # Never return an explicitly truncated Gemini response.
                if "MAX_TOKENS" in str(finish_reason).upper():
                    raise RuntimeError(
                        "Gemini stopped at the output-token limit. "
                        "The analysis was not returned because it may "
                        "be incomplete."
                    )

                result = raw_text.strip()
                if not result:
                    raise RuntimeError(
                        "Gemini returned an empty business analysis."
                    )

                # Remove unsupported claims about business profitability.
                unsupported_profit_claims = [
                    r"\b(?:the|your) business is profitable\b",
                    r"\byou are profitable\b",
                    r"\b(?:the|your) business (?:made|generated|earned|recorded|achieved) a profit\b",
                    r"\b(?:the|your) business generated profit\b",
                ]

                filtered_lines = []
                removed_claim = False

                for line in result.splitlines():
                    if any(
                        re.search(pattern, line, flags=re.IGNORECASE)
                        for pattern in unsupported_profit_claims
                    ):
                        removed_claim = True
                        continue
                    filtered_lines.append(line)

                result = "\n".join(filtered_lines).strip()

                if removed_claim:
                    note = (
                        "Financial accuracy note: The supplied records "
                        "do not establish accounting profit."
                    )
                    result = f"{result}\n\n{note}" if result else note

                return result

            except errors.APIError as exc:
                status = getattr(exc, "code", None)
                print(f"Gemini API error: HTTP {status or 'unknown'}")

                retryable = status is None or status in {
                    408, 429, 500, 502, 503, 504
                }
                if retryable and attempt < 2:
                    time.sleep(1 + attempt * 2)
                    continue

                raise RuntimeError(
                    f"Gemini provider request failed (HTTP "
                    f"{status or 'unknown'})."
                ) from exc

            except (httpx.TransportError, TimeoutError, ConnectionError) as exc:
                print(
                    "Gemini connection error: "
                    f"{type(exc).__name__}"
                )
                if attempt < 2:
                    time.sleep(1 + attempt * 2)
                    continue

                raise RuntimeError(
                    "Gemini provider request failed after retries."
                ) from exc

    finally:
        client.close()

    raise RuntimeError("Gemini provider request failed.")
