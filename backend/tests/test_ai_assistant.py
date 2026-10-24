from fastapi.testclient import TestClient

from app.routes import ai_assistant


def create_business(client: TestClient) -> int:
    response = client.post(
        "/businesses/",
        json={
            "name": "Chat Test Foods",
            "business_type": "Retail",
            "location": "Ado-Ekiti",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def chat_payload(business_id: int, role: str = "user") -> dict:
    return {
        "business_id": business_id,
        "messages": [
            {
                "role": role,
                "content": "Please summarize my recorded finances.",
            }
        ],
    }


def test_chat_endpoint_returns_grounded_assistant_reply(
    client: TestClient,
    monkeypatch,
):
    business_id = create_business(client)
    captured = {}

    def fake_generate(context, messages):
        captured["context"] = context
        captured["messages"] = messages
        return "Your recorded income is currently limited by the records available."

    monkeypatch.setattr(
        ai_assistant,
        "generate_chat_reply",
        fake_generate,
    )

    response = client.post(
        "/ai-assistant/chat",
        json=chat_payload(business_id),
    )

    assert response.status_code == 200, response.text
    assert response.json() == {
        "business_id": business_id,
        "answer": "Your recorded income is currently limited by the records available.",
    }
    assert captured["context"]["business"]["name"] == "Chat Test Foods"
    assert captured["context"]["financial_summary"]["transaction_count"] == 0
    assert captured["messages"][0]["role"] == "user"


def test_chat_endpoint_rejects_access_to_another_users_business(
    client: TestClient,
    monkeypatch,
):
    business_id = create_business(client)

    def should_not_run(*args, **kwargs):
        raise AssertionError("AI must not run for an unauthorized business")

    monkeypatch.setattr(
        ai_assistant,
        "generate_chat_reply",
        should_not_run,
    )

    registration = client.post(
        "/auth/register",
        json={
            "email": "chat-second-user@example.com",
            "password": "SecondPassword123",
        },
    )
    assert registration.status_code == 201, registration.text

    login = client.post(
        "/auth/login",
        json={
            "email": "chat-second-user@example.com",
            "password": "SecondPassword123",
        },
    )
    assert login.status_code == 200, login.text
    client.headers["Authorization"] = (
        f"Bearer {login.json()['access_token']}"
    )

    response = client.post(
        "/ai-assistant/chat",
        json=chat_payload(business_id),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Business not found."


def test_chat_endpoint_rejects_invalid_message_role(client: TestClient):
    business_id = create_business(client)

    response = client.post(
        "/ai-assistant/chat",
        json=chat_payload(business_id, role="system"),
    )

    assert response.status_code == 422
    assert "role" in str(response.json()["detail"]).lower()


def test_chat_endpoint_returns_safe_error_when_provider_fails(
    client: TestClient,
    monkeypatch,
):
    business_id = create_business(client)

    def fake_generate(context, messages):
        raise RuntimeError(
            "The AI assistant is temporarily unavailable. Please try again shortly."
        )

    monkeypatch.setattr(
        ai_assistant,
        "generate_chat_reply",
        fake_generate,
    )

    response = client.post(
        "/ai-assistant/chat",
        json=chat_payload(business_id),
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "The AI assistant is temporarily unavailable. Please try again shortly."
    )


def test_chat_endpoint_requires_authentication(client: TestClient):
    original_authorization = client.headers.pop("Authorization", None)

    try:
        response = client.post(
            "/ai-assistant/chat",
            json=chat_payload(1),
        )
        assert response.status_code == 401
    finally:
        if original_authorization:
            client.headers["Authorization"] = original_authorization


def test_chat_endpoint_requires_last_message_to_be_from_user(
    client: TestClient,
):
    business_id = create_business(client)

    response = client.post(
        "/ai-assistant/chat",
        json={
            "business_id": business_id,
            "messages": [
                {
                    "role": "user",
                    "content": "Summarize my finances.",
                },
                {
                    "role": "assistant",
                    "content": "Here is a summary.",
                },
            ],
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "The last message must be a user message."
    )
