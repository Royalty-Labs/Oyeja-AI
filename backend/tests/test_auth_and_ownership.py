from fastapi.testclient import TestClient


def register_second_user(client: TestClient) -> str:
    registration = client.post(
        "/auth/register",
        json={
            "email": "second@example.com",
            "password": "SecondPassword123",
        },
    )
    assert registration.status_code == 201
    assert "hashed_password" not in registration.json()

    login = client.post(
        "/auth/login",
        json={
            "email": "SECOND@example.com",
            "password": "SecondPassword123",
        },
    )
    assert login.status_code == 200

    return login.json()["access_token"]


def test_register_login_and_current_user(client: TestClient):
    registration = client.post(
        "/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "NewPassword123",
        },
    )

    assert registration.status_code == 201
    user = registration.json()
    assert user["email"] == "newuser@example.com"
    assert "hashed_password" not in user

    duplicate = client.post(
        "/auth/register",
        json={
            "email": "NEWUSER@example.com",
            "password": "AnotherPassword123",
        },
    )
    assert duplicate.status_code == 409

    login = client.post(
        "/auth/login",
        json={
            "email": "NEWUSER@example.com",
            "password": "NewPassword123",
        },
    )
    assert login.status_code == 200
    assert login.json()["token_type"] == "bearer"
    assert login.json()["expires_in"] > 0

    token = login.json()["access_token"]
    account = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert account.status_code == 200
    assert account.json()["email"] == "newuser@example.com"

    wrong_password = client.post(
        "/auth/login",
        json={
            "email": "newuser@example.com",
            "password": "WrongPassword123",
        },
    )
    assert wrong_password.status_code == 401


def test_protected_routes_reject_missing_and_invalid_tokens(
    client: TestClient,
):
    original_authorization = client.headers.get("Authorization")

    try:
        client.headers.pop("Authorization", None)

        response = client.get("/businesses/1")
        assert response.status_code == 401

        client.headers["Authorization"] = "Bearer invalid.token.value"

        response = client.get("/businesses/1")
        assert response.status_code == 401
    finally:
        if original_authorization:
            client.headers["Authorization"] = original_authorization
        else:
            client.headers.pop("Authorization", None)


def test_users_cannot_access_another_users_business_or_transactions(
    client: TestClient,
):
    # The fixture authenticates the first user.
    business_response = client.post(
        "/businesses/",
        json={
            "name": "Owner One Foods",
            "business_type": "Retail",
            "location": "Ado-Ekiti",
        },
    )
    assert business_response.status_code == 201
    business_id = business_response.json()["id"]

    transaction_response = client.post(
        "/transactions/",
        json={
            "business_id": business_id,
            "transaction_type": "income",
            "amount": "25000",
            "category": "Sales",
            "description": "Test sale",
            "occurred_at": "2026-10-20T10:30:00Z",
        },
    )
    assert transaction_response.status_code == 201
    transaction_id = transaction_response.json()["id"]

    # Register and authenticate a different user.
    second_user_token = register_second_user(client)
    client.headers["Authorization"] = f"Bearer {second_user_token}"

    # The second user must not see the first user's business.
    protected_business_paths = [
        f"/businesses/{business_id}",
        f"/businesses/{business_id}/overview",
        f"/businesses/{business_id}/ai-analysis",
    ]

    for path in protected_business_paths:
        response = client.get(path)
        assert response.status_code == 404, (
            f"Expected 404 for {path}, got {response.status_code}"
        )

    # The second user cannot create transactions for that business.
    create_foreign_transaction = client.post(
        "/transactions/",
        json={
            "business_id": business_id,
            "transaction_type": "income",
            "amount": "1000",
            "category": "Sales",
            "description": "Unauthorized attempt",
            "occurred_at": "2026-10-20T11:30:00Z",
        },
    )
    assert create_foreign_transaction.status_code == 404

    # The second user cannot read the first user's transaction data.
    protected_transaction_paths = [
        f"/transactions/business/{business_id}",
        f"/transactions/business/{business_id}/summary",
        f"/transactions/business/{business_id}/category-breakdown",
        f"/transactions/business/{business_id}/monthly-comparison?year=2026&month=10",
        f"/transactions/business/{business_id}/insights",
    ]

    for path in protected_transaction_paths:
        response = client.get(path)
        assert response.status_code == 404, (
            f"Expected 404 for {path}, got {response.status_code}"
        )

    # Nor can the second user modify or delete the first user's transaction.
    update_response = client.patch(
        f"/transactions/{transaction_id}",
        json={"description": "Unauthorized modification"},
    )
    assert update_response.status_code == 404

    delete_response = client.delete(
        f"/transactions/{transaction_id}",
    )
    assert delete_response.status_code == 404
