import httpx
import pytest

from app.ai import ai_service


@pytest.fixture
def configured_ai(monkeypatch):
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_API_KEY", "test-key")
    monkeypatch.setattr(
        ai_service.settings, "OYEJA_AI_BASE_URL", "https://example.test/v1"
    )
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_MODEL", "test-model")


def make_response(payload, status_code=200):
    request = httpx.Request(
        "POST", "https://example.test/v1/chat/completions"
    )
    return httpx.Response(status_code, json=payload, request=request)


def test_ai_service_returns_analysis_without_duplicate_accuracy_note(
    configured_ai, monkeypatch
):
    def fake_post(url, **kwargs):
        assert url == "https://example.test/v1/chat/completions"
        assert kwargs["json"]["model"] == "test-model"
        return make_response({
            "choices": [
                {
                    "message": {
                        "content": "### Findings\nReview recorded expenses."
                    }
                }
            ]
        })

    monkeypatch.setattr(ai_service.httpx, "post", fake_post)

    result = ai_service.generate_business_analysis(
        {"financial_summary": {"net_balance": "1000.00"}}
    )

    assert "Review recorded expenses." in result
    assert "Financial Accuracy Note" not in result


def test_ai_service_rejects_incomplete_configuration(monkeypatch):
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_API_KEY", "")
    monkeypatch.setattr(
        ai_service.settings, "OYEJA_AI_BASE_URL", "https://example.test/v1"
    )
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_MODEL", "test-model")

    with pytest.raises(RuntimeError, match="configuration is incomplete"):
        ai_service.generate_business_analysis({})


def test_ai_service_rejects_empty_analysis(configured_ai, monkeypatch):
    monkeypatch.setattr(
        ai_service.httpx,
        "post",
        lambda *args, **kwargs: make_response({
            "choices": [{"message": {"content": "   "}}]
        }),
    )

    with pytest.raises(RuntimeError, match="empty analysis"):
        ai_service.generate_business_analysis({})


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"choices": []},
        {"choices": [{"message": {}}]},
    ],
)
def test_ai_service_rejects_malformed_responses(
    configured_ai, monkeypatch, payload
):
    monkeypatch.setattr(
        ai_service.httpx,
        "post",
        lambda *args, **kwargs: make_response(payload),
    )

    with pytest.raises(RuntimeError, match="unexpected response"):
        ai_service.generate_business_analysis({})


def test_ai_service_converts_http_errors_to_runtime_error(
    configured_ai, monkeypatch
):
    def failing_post(*args, **kwargs):
        request = httpx.Request(
            "POST", "https://example.test/v1/chat/completions"
        )
        raise httpx.ConnectError(
            "Simulated connection failure", request=request
        )

    monkeypatch.setattr(ai_service.httpx, "post", failing_post)

    with pytest.raises(RuntimeError, match="provider request failed"):
        ai_service.generate_business_analysis({})


def test_ai_service_filters_unsupported_profit_claim(
    configured_ai, monkeypatch
):
    monkeypatch.setattr(
        ai_service.httpx,
        "post",
        lambda *args, **kwargs: make_response({
            "choices": [{
                "message": {
                    "content": (
                        "### Findings\n"
                        "The business generated a profit of 50000."
                    )
                }
            }]
        }),
    )

    result = ai_service.generate_business_analysis({})

    assert "generated a profit of 50000" not in result
    assert "does not establish accounting profit" in result


def test_ai_service_rejects_none_analysis(configured_ai, monkeypatch):
    monkeypatch.setattr(
        ai_service.httpx,
        "post",
        lambda *args, **kwargs: make_response({
            "choices": [{"message": {"content": None}}]
        }),
    )

    with pytest.raises(RuntimeError, match="empty analysis"):
        ai_service.generate_business_analysis({})
