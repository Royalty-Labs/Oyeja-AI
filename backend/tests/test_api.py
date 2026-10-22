from decimal import Decimal

import pytest


def create_business(client):
    response = client.post(
        "/businesses/",
        json={
            "name": "Royalty Foods",
            "business_type": "Retail",
            "location": "Ado-Ekiti",
        },
    )

    assert response.status_code in (200, 201)
    return response.json()


def create_transaction(client, business_id, transaction_type, amount, category):
    response = client.post(
        "/transactions/",
        json={
            "business_id": business_id,
            "transaction_type": transaction_type,
            "amount": str(amount),
            "category": category,
            "occurred_at": "2026-10-20T10:30:00Z",
        },
    )

    assert response.status_code in (200, 201)
    return response.json()


def test_root_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_and_retrieve_business(client):
    created = create_business(client)

    assert created["name"] == "Royalty Foods"
    assert created["location"] == "Ado-Ekiti"

    response = client.get(f"/businesses/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]
    assert response.json()["name"] == "Royalty Foods"


def test_missing_business_returns_404(client):
    response = client.get("/businesses/999999")

    assert response.status_code == 404


def test_create_and_list_transactions(client):
    business = create_business(client)

    created = create_transaction(
        client,
        business["id"],
        "income",
        "12500.50",
        "Sales",
    )

    assert created["business_id"] == business["id"]
    assert Decimal(str(created["amount"])) == Decimal("12500.50")

    response = client.get(
        f"/transactions/business/{business['id']}"
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["category"] == "Sales"


def test_invalid_transaction_returns_422(client):
    business = create_business(client)

    response = client.post(
        "/transactions/",
        json={
            "business_id": business["id"],
            "transaction_type": "refund",
            "amount": "100.00",
            "category": "Sales",
            "occurred_at": "2026-10-20T10:30:00Z",
        },
    )

    assert response.status_code == 422


def test_business_overview_calculates_financial_totals(client):
    business = create_business(client)
    business_id = business["id"]

    create_transaction(
        client, business_id, "income", "50000.00", "Sales"
    )
    create_transaction(
        client, business_id, "expense", "12000.00", "Supplies"
    )

    response = client.get(
        f"/businesses/{business_id}/overview"
    )

    assert response.status_code == 200

    overview = response.json()
    summary = overview["financial_summary"]

    assert Decimal(str(summary["total_income"])) == Decimal("50000.00")
    assert Decimal(str(summary["total_expenses"])) == Decimal("12000.00")
    assert Decimal(str(summary["net_balance"])) == Decimal("38000.00")
    assert summary["transaction_count"] == 2


def test_update_transaction(client):
    business = create_business(client)

    transaction = create_transaction(
        client,
        business["id"],
        "expense",
        "2500.00",
        "Supplies",
    )

    response = client.patch(
        f"/transactions/{transaction['id']}",
        json={"category": "Transport"},
    )

    assert response.status_code == 200
    assert response.json()["category"] == "Transport"


def test_delete_transaction(client):
    business = create_business(client)

    transaction = create_transaction(
        client,
        business["id"],
        "expense",
        "2500.00",
        "Supplies",
    )

    response = client.delete(
        f"/transactions/{transaction['id']}"
    )

    assert response.status_code in (200, 204)

    remaining = client.get(
        f"/transactions/business/{business['id']}"
    )

    assert remaining.status_code == 200
    assert remaining.json() == []

@pytest.mark.parametrize("method", ["patch", "delete"])
def test_missing_transaction_returns_404(client, method):
    if method == "patch":
        response = client.patch(
            "/transactions/999999",
            json={"category": "Transport"},
        )
    else:
        response = client.delete("/transactions/999999")

    assert response.status_code == 404


def test_api_rejects_null_required_transaction_field(client):
    business = create_business(client)

    transaction = create_transaction(
        client,
        business["id"],
        "expense",
        "2500.00",
        "Supplies",
    )

    response = client.patch(
        f"/transactions/{transaction['id']}",
        json={"amount": None},
    )

    assert response.status_code == 422

def test_financial_summary_respects_inclusive_date_range(client):
    business = create_business(client)
    business_id = business["id"]

    transactions = [
        ("income", "10000.00", "Sales", "2026-10-01T00:00:00Z"),
        ("expense", "2000.00", "Supplies", "2026-10-31T23:59:59Z"),
        ("income", "5000.00", "Sales", "2026-11-01T00:00:00Z"),
    ]

    for transaction_type, amount, category, occurred_at in transactions:
        created = create_transaction(
            client, business_id, transaction_type, amount, category
        )
        update = client.patch(
            f"/transactions/{created['id']}",
            json={"occurred_at": occurred_at},
        )
        assert update.status_code == 200

    response = client.get(
        f"/transactions/business/{business_id}/summary",
        params={
            "start_date": "2026-10-01",
            "end_date": "2026-10-31",
        },
    )

    assert response.status_code == 200
    summary = response.json()
    assert Decimal(str(summary["total_income"])) == Decimal("10000.00")
    assert Decimal(str(summary["total_expenses"])) == Decimal("2000.00")
    assert Decimal(str(summary["net_balance"])) == Decimal("8000.00")
    assert summary["transaction_count"] == 2


def test_financial_summary_rejects_reversed_date_range(client):
    business = create_business(client)

    response = client.get(
        f"/transactions/business/{business['id']}/summary",
        params={
            "start_date": "2026-10-31",
            "end_date": "2026-10-01",
        },
    )

    assert response.status_code == 400


def test_category_breakdown_groups_transactions_correctly(client):
    business = create_business(client)
    business_id = business["id"]

    create_transaction(client, business_id, "income", "10000.00", "Sales")
    create_transaction(client, business_id, "income", "5000.00", "Sales")
    create_transaction(client, business_id, "expense", "2000.00", "Supplies")
    create_transaction(client, business_id, "expense", "1000.00", "Supplies")

    response = client.get(
        f"/transactions/business/{business_id}/category-breakdown"
    )

    assert response.status_code == 200
    result = response.json()

    assert result["business_id"] == business_id

    categories = {
        (item["transaction_type"], item["category"]): item
        for item in result["categories"]
    }

    sales = categories[("income", "Sales")]
    assert Decimal(str(sales["total_amount"])) == Decimal("15000.00")
    assert sales["transaction_count"] == 2

    supplies = categories[("expense", "Supplies")]
    assert Decimal(str(supplies["total_amount"])) == Decimal("3000.00")
    assert supplies["transaction_count"] == 2


def test_monthly_comparison_calculates_changes(client):
    business = create_business(client)
    business_id = business["id"]

    transactions = [
        ("income", "80000.00", "Sales", "2026-09-15T12:00:00Z"),
        ("expense", "20000.00", "Supplies", "2026-09-16T12:00:00Z"),
        ("income", "100000.00", "Sales", "2026-10-15T12:00:00Z"),
        ("expense", "30000.00", "Supplies", "2026-10-16T12:00:00Z"),
    ]

    for transaction_type, amount, category, occurred_at in transactions:
        created = create_transaction(
            client, business_id, transaction_type, amount, category
        )
        update = client.patch(
            f"/transactions/{created['id']}",
            json={"occurred_at": occurred_at},
        )
        assert update.status_code == 200

    response = client.get(
        f"/transactions/business/{business_id}/monthly-comparison",
        params={"year": 2026, "month": 10},
    )

    assert response.status_code == 200
    result = response.json()

    current = result["current_month"]
    previous = result["previous_month"]
    changes = result["changes"]

    assert current["year"] == 2026
    assert current["month"] == 10
    assert Decimal(str(current["total_income"])) == Decimal("100000.00")
    assert Decimal(str(current["total_expenses"])) == Decimal("30000.00")
    assert Decimal(str(current["net_balance"])) == Decimal("70000.00")
    assert current["transaction_count"] == 2

    assert previous["month"] == 9
    assert Decimal(str(previous["total_income"])) == Decimal("80000.00")
    assert Decimal(str(previous["total_expenses"])) == Decimal("20000.00")
    assert Decimal(str(previous["net_balance"])) == Decimal("60000.00")

    assert Decimal(str(changes["income_change"])) == Decimal("20000.00")
    assert Decimal(str(changes["expenses_change"])) == Decimal("10000.00")
    assert Decimal(str(changes["income_change_percent"])) == Decimal("25.00")
    assert Decimal(str(changes["expenses_change_percent"])) == Decimal("50.00")


def test_monthly_comparison_handles_zero_previous_month(client):
    business = create_business(client)
    business_id = business["id"]

    create_transaction(
        client, business_id, "income", "10000.00", "Sales"
    )

    response = client.get(
        f"/transactions/business/{business_id}/monthly-comparison",
        params={"year": 2026, "month": 10},
    )

    assert response.status_code == 200
    result = response.json()

    assert result["changes"]["income_change_percent"] is None
    assert result["changes"]["expenses_change_percent"] is None
    assert result["changes"]["net_balance_change_percent"] is None


def test_business_insights_handle_empty_transaction_history(client):
    business = create_business(client)

    response = client.get(
        f"/transactions/business/{business['id']}/insights"
    )

    assert response.status_code == 200
    result = response.json()

    assert result["business_id"] == business["id"]
    assert Decimal(str(result["total_income"])) == Decimal("0")
    assert Decimal(str(result["total_expenses"])) == Decimal("0")
    assert Decimal(str(result["net_balance"])) == Decimal("0")
    assert any(
        insight["title"] == "No transaction data yet"
        for insight in result["insights"]
    )


def test_ai_analysis_returns_404_for_missing_business(client, monkeypatch):
    from app.routes import ai_analysis

    def unexpected_provider_call(context):
        raise AssertionError("Provider should not be called for a missing business.")

    monkeypatch.setattr(
        ai_analysis,
        "generate_business_analysis",
        unexpected_provider_call,
    )

    response = client.get("/businesses/999999/ai-analysis")

    assert response.status_code == 404
    assert response.json()["detail"] == "Business not found."


def test_ai_analysis_returns_503_when_provider_fails(client, monkeypatch):
    from app.routes import ai_analysis

    business = create_business(client)

    def failing_provider(context):
        raise RuntimeError("Simulated AI provider failure.")

    monkeypatch.setattr(
        ai_analysis,
        "generate_business_analysis",
        failing_provider,
    )

    response = client.get(
        f"/businesses/{business['id']}/ai-analysis"
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Simulated AI provider failure."


def test_ai_analysis_uses_backend_calculated_financial_data(
    client, monkeypatch
):
    from app.routes import ai_analysis

    business = create_business(client)
    business_id = business["id"]

    create_transaction(
        client, business_id, "income", "50000.00", "Sales"
    )
    create_transaction(
        client, business_id, "expense", "12000.00", "Supplies"
    )

    captured_context = {}

    def successful_provider(context):
        captured_context.update(context)
        return (
            "### Financial Summary\n"
            "Recorded income exceeds recorded expenses.\n\n"
            "### Findings\n"
            "Review the recorded transactions regularly.\n\n"
            "### Next Steps\n"
            "Continue maintaining accurate records.\n\n"
            "### Limitations\n"
            "Only recorded transactions were analyzed."
        )

    monkeypatch.setattr(
        ai_analysis,
        "generate_business_analysis",
        successful_provider,
    )

    response = client.get(
        f"/businesses/{business_id}/ai-analysis"
    )

    assert response.status_code == 200

    result = response.json()
    assert result["business_id"] == business_id
    assert isinstance(result["model"], str)
    assert result["analysis"].startswith("### Financial Summary")

    summary = captured_context["financial_summary"]

    assert summary["total_income"] == "50000.00"
    assert summary["total_expenses"] == "12000.00"
    assert summary["net_balance"] == "38000.00"
    assert summary["transaction_count"] == 2

    metrics = captured_context["derived_metrics"]
    assert metrics["expense_to_income_percentage"] == 24.0
    assert metrics["income_transaction_count"] == 1
    assert metrics["expense_transaction_count"] == 1

    assert "not a profit margin" in metrics["interpretation"]
    assert len(captured_context["recent_transactions"]) == 2
    assert "limitations" in captured_context
