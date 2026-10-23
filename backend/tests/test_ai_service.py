from types import SimpleNamespace

import httpx

import pytest

from app.ai import ai_service


@pytest.fixture
def configured_ai(monkeypatch):
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_API_KEY", "test-key")
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_MODEL", "test-model")


def install_fake_client(monkeypatch, response_text="Review recorded expenses.", error=None):
    class FakeModels:
        def generate_content(self, **kwargs):
            assert kwargs["model"] == "test-model"
            assert isinstance(kwargs["contents"], str)
            if error is not None:
                raise error
            return SimpleNamespace(text=response_text)

    class FakeClient:
        def __init__(self, **kwargs):
            assert kwargs["api_key"] == "test-key"
            self.models = FakeModels()
            self.closed = False

        def close(self):
            self.closed = True

    monkeypatch.setattr(ai_service.genai, "Client", FakeClient)


def test_ai_service_returns_analysis(configured_ai, monkeypatch):
    install_fake_client(monkeypatch)
    result = ai_service.generate_business_analysis(
        {"financial_summary": {"net_balance": "1000.00"}}
    )
    assert "Review recorded expenses." in result
    assert "Financial Accuracy Note" not in result


def test_ai_service_rejects_incomplete_configuration(monkeypatch):
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_API_KEY", "")
    monkeypatch.setattr(ai_service.settings, "OYEJA_AI_MODEL", "test-model")
    with pytest.raises(RuntimeError, match="configuration is incomplete"):
        ai_service.generate_business_analysis({})


@pytest.mark.parametrize("response_text", ["", "   ", None])
def test_ai_service_rejects_empty_analysis(configured_ai, monkeypatch, response_text):
    install_fake_client(monkeypatch, response_text=response_text)
    with pytest.raises(RuntimeError, match="empty business analysis"):
        ai_service.generate_business_analysis({})


def test_ai_service_converts_connection_errors_to_runtime_error(configured_ai, monkeypatch):
    install_fake_client(monkeypatch, error=ConnectionError("Simulated connection failure"))
    with pytest.raises(RuntimeError, match="provider request failed"):
        ai_service.generate_business_analysis({})


def test_ai_service_warns_about_unsupported_profit_claim(configured_ai, monkeypatch):
    install_fake_client(
        monkeypatch,
        response_text="### Findings\nThe business is profitable.",
    )
    result = ai_service.generate_business_analysis({})
    assert "The business is profitable." not in result
    assert "do not establish accounting profit" in result


def test_ai_service_passes_business_context_to_model(configured_ai, monkeypatch):
    captured = {}

    class FakeModels:
        def generate_content(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(text="### Findings\nReview expenses.")

    class FakeClient:
        def __init__(self, **kwargs):
            self.models = FakeModels()

        def close(self):
            pass

    monkeypatch.setattr(ai_service.genai, "Client", FakeClient)
    context = {"income": 1000, "expenses": 400}
    ai_service.generate_business_analysis(context)
    assert str(context) in captured["contents"]
    assert "Never equate net balance with accounting profit" in captured["contents"]


def test_ai_service_closes_client_after_success(configured_ai, monkeypatch):
    created = []

    class FakeModels:
        def generate_content(self, **kwargs):
            return SimpleNamespace(text="Analysis complete.")

    class FakeClient:
        def __init__(self, **kwargs):
            self.models = FakeModels()
            self.closed = False
            created.append(self)

        def close(self):
            self.closed = True

    monkeypatch.setattr(ai_service.genai, "Client", FakeClient)
    ai_service.generate_business_analysis({})
    assert len(created) == 1
    assert created[0].closed


def test_ai_service_removes_unsupported_generated_profit_claim(
    configured_ai, monkeypatch
):
    install_fake_client(
        monkeypatch,
        response_text=(
            "### Findings\n"
            "The business generated a profit of 50000.\n"
            "Review recorded expenses."
        ),
    )

    result = ai_service.generate_business_analysis({})

    assert "generated a profit of 50000" not in result
    assert "Review recorded expenses." in result
    assert "do not establish accounting profit" in result


def test_ai_service_retries_httpx_read_timeout(
    configured_ai, monkeypatch
):
    error = httpx.ReadTimeout(
        "Simulated read timeout",
        request=httpx.Request(
            "POST", "https://example.test/"
        ),
    )
    install_fake_client(monkeypatch, error=error)
    monkeypatch.setattr(ai_service.time, "sleep", lambda _: None)

    with pytest.raises(
        RuntimeError, match="provider request failed after retries"
    ):
        ai_service.generate_business_analysis({})
