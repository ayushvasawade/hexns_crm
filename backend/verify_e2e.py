import asyncio
import sys
from decimal import Decimal
from uuid import uuid4
from datetime import date, timedelta
from httpx import ASGITransport, AsyncClient

from app.main import app

async def run_end_to_end_verification():
    print("==================================================")
    print("   HEXNS CRM — Phase 3 Live End-to-End Verification")
    print("==================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Reject invalid credentials
        print("\n[Step 1] Testing invalid credentials rejection...")
        invalid_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@hexns.com",
            "password": "WrongPassword123"
        })
        assert invalid_resp.status_code == 401, f"Expected 401, got {invalid_resp.status_code}: {invalid_resp.text}"
        print("  [PASS] Invalid credentials correctly rejected (401 Unauthorized)")

        # 2. Login with valid seed credentials
        print("\n[Step 2] Logging in with seed user (admin@hexns.com)...")
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@hexns.com",
            "password": "Hexns@12345"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token_data = login_resp.json()
        token = token_data["access_token"]
        assert token, "No access token in response"
        print(f"  [PASS] Login successful! Token type: {token_data['token_type']}")

        headers = {"Authorization": f"Bearer {token}"}

        # 3. Verify /auth/me
        print("\n[Step 3] Fetching current user identity (/api/v1/auth/me)...")
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200, f"Get me failed: {me_resp.text}"
        me_data = me_resp.json()
        assert me_data["email"] == "admin@hexns.com"
        print(f"  [PASS] User authenticated: {me_data['full_name']} ({me_data['email']})")

        # 4. Verify unauthenticated CRM access is rejected
        print("\n[Step 4] Confirming unauthenticated access rejection on CRM endpoints...")
        unauth_resp = await client.get("/api/v1/clients")
        assert unauth_resp.status_code == 401
        print("  [PASS] Unauthenticated GET /api/v1/clients rejected (401)")

        # 5. Create a Client
        test_suffix = str(uuid4())[:8]
        client_payload = {
            "legal_entity_name": f"Test Client {test_suffix} Pvt Ltd",
            "brand_trade_name": f"Client {test_suffix}",
            "primary_contact_person": "Priya Sharma",
            "official_phone": "+91 22 4000 1111",
            "mobile": "+91 98200 11111",
            "billing_email": f"billing_{test_suffix}@example.com",
            "registered_address": "Level 4, Dynasty Business Park, Andheri Kurla Road",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pin_code": "400059",
            "gst_registered": True,
            "gstin": "27AABCT1234A1Z5",
            "pan": "AABCT1234A",
            "state_code": "27",
            "place_of_supply": "Maharashtra (27)",
            "reverse_charge": False,
            "tax_exempt": False,
            "client_segment": "Retainer",
            "industry_category": "Technology & SaaS",
            "assigned_account_lead": "Vikram Malhotra",
            "default_payment_terms": "30 Days Net",
            "status": "Active"
        }
        print(f"\n[Step 5] Creating client '{client_payload['legal_entity_name']}'...")
        client_resp = await client.post("/api/v1/clients", json=client_payload, headers=headers)
        assert client_resp.status_code == 201, f"Create client failed: {client_resp.text}"
        created_client = client_resp.json()
        client_id = created_client["id"]
        print(f"  [PASS] Client created successfully: ID = {client_id}")

        # 6. Create a Service
        # 6. Retrieve genuine catalogue service (prevents test data pollution)
        print("\n[Step 6] Retrieving genuine catalogue service for verification...")
        cat_resp = await client.get("/api/v1/services?status=Active&page=1&page_size=5", headers=headers)
        assert cat_resp.status_code == 200, f"Get services failed: {cat_resp.text}"
        cat_items = cat_resp.json()["items"]
        assert len(cat_items) > 0, "Expected active services in catalogue"
        created_service = cat_items[0]
        service_id = created_service["id"]
        service_payload = {
            "service_name": f"AI Brand Video Production {test_suffix}",
            "category": "Creative & Content Production",
            "group_category": "Production",
            "description": "High-end 4K generative AI brand commercial with color grading.",
            "billing_unit": "Per Project",
            "sac_code": "998311",
            "min_price": "120000.00",
            "default_price": "150000.00",
            "max_price": "200000.00",
            "internal_cost_price": "80000.00",
            "gst_rate": "18.00",
            "status": "Active"
            "service_name": created_service["serviceName"],
            "category": created_service["category"],
            "default_price": created_service["defaultPrice"],
            "min_price": created_service["minPrice"],
            "max_price": created_service["maxPrice"],
        }
        print(f"\n[Step 6] Creating service '{service_payload['service_name']}'...")
        service_resp = await client.post("/api/v1/services", json=service_payload, headers=headers)
        assert service_resp.status_code == 201, f"Create service failed: {service_resp.text}"
        created_service = service_resp.json()
        service_id = created_service["id"]
        print(f"  [PASS] Service created successfully: ID = {service_id}")
        print(f"  [PASS] Using genuine catalogue service for downstream tests: '{created_service['serviceName']}' ({service_id})")

        # 7. Create a Quotation
        today = date.today()
        valid_until = today + timedelta(days=30)
        quotation_number = f"Q-TEST-{test_suffix.upper()}"
        quotation_payload = {
            "client_id": client_id,
            "quotation_number": quotation_number,
            "project_title": f"Production Proposal {test_suffix}",
            "quotation_date": str(today),
            "valid_until": str(valid_until),
            "place_of_supply": "Maharashtra (27)",
            "is_inter_state": False,
            "sales_executive": "Vikram Malhotra",
            "document_discount_type": "percentage",
            "document_discount_value": "10.00",
            "payment_terms": "50% Advance with PO",
            "delivery_timeline": "10 working days",
            "validity_days": 30,
            "scope_notes": "All production deliverables included",
            "exclusions": "Third-party paid actor talent fees",
            "terms_and_conditions": "1. Standard agency terms apply.",
            "internal_notes": "Priority enterprise prospect.",
            "status": "Draft",
            "line_items": [
                {
                    "service_id": service_id,
                    "service_name": service_payload["service_name"],
                    "description": "Full commercial package",
                    "sac_code": "998311",
                    "quantity": "1.00",
                    "billing_unit": "Per Project",
                    "min_price": "120000.00",
                    "default_price": "150000.00",
                    "max_price": "200000.00",
                    "selected_tier": "DEFAULT",
                    "negotiated_unit_price": "150000.00",
                    "item_discount_type": "percentage",
                    "item_discount_value": "0.00",
                    "gst_rate": "18.00"
                }
            ]
        }
        print(f"\n[Step 7] Creating quotation '{quotation_number}' with line items...")
        quote_resp = await client.post("/api/v1/quotations", json=quotation_payload, headers=headers)
        assert quote_resp.status_code == 201, f"Create quote failed: {quote_resp.text}"
        created_quote = quote_resp.json()
        quote_id = created_quote["id"]
        # Subtotal: 150000, 10% document discount: 15000 => Taxable: 135000. 18% GST: 24300 => Grand total: 159300.
        print(f"  [PASS] Quotation created! ID = {quote_id}")
        print(f"    - Subtotal: INR {created_quote.get('subtotal')}")
        print(f"    - Discount: INR {created_quote.get('documentDiscountAmount')}")
        print(f"    - Total Taxable: INR {created_quote.get('totalTaxableAmount')}")
        print(f"    - Total Tax (CGST+SGST): INR {Decimal(str(created_quote.get('cgstAmount', 0))) + Decimal(str(created_quote.get('sgstAmount', 0)))}")
        print(f"    - Grand Total: INR {created_quote.get('grandTotal')}")

        # 8. Send & Accept the Quotation (transition Draft -> Sent -> Accepted)
        print(f"\n[Step 8] Sending & Accepting quotation '{quotation_number}'...")
        sent_resp = await client.patch(
            f"/api/v1/quotations/{quote_id}",
            json={"status": "Sent"},
            headers=headers
        )
        assert sent_resp.status_code == 200, f"Send quote failed: {sent_resp.text}"

        accept_resp = await client.patch(
            f"/api/v1/quotations/{quote_id}",
            json={"status": "Accepted"},
            headers=headers
        )
        assert accept_resp.status_code == 200, f"Accept quote failed: {accept_resp.text}"
        print(f"  [PASS] Quotation status changed to: {accept_resp.json()['status']}")

        # 9. Convert Quotation to Invoice
        inv_number = f"INV-TEST-{test_suffix.upper()}"
        due_date = str(today + timedelta(days=15))
        print(f"\n[Step 9] Converting quotation into invoice '{inv_number}'...")
        convert_resp = await client.post(
            f"/api/v1/quotations/{quote_id}/convert?invoice_number={inv_number}&due_date={due_date}",
            headers=headers
        )
        assert convert_resp.status_code in (200, 201), f"Convert quote failed: {convert_resp.text}"
        created_invoice = convert_resp.json()
        invoice_id = created_invoice["id"]
        print(f"  [PASS] Invoice generated: ID = {invoice_id}")
        print(f"    - Invoice Number: {created_invoice['invoiceNumber']}")
        print(f"    - Invoice Total: INR {created_invoice['grandTotal']}")
        print(f"    - Outstanding Balance: INR {created_invoice['balanceDue']}")
        print(f"    - Payment Status: {created_invoice['status']}")

        # 10. Record Partial Payment
        pay_amount = "59300.00"
        pay_payload = {
            "payment_number": f"REC-TEST-{test_suffix.upper()}-1",
            "client_id": client_id,
            "invoice_id": invoice_id,
            "amount": pay_amount,
            "payment_date": str(today),
            "payment_mode": "NEFT / RTGS / IMPS",
            "transaction_reference": f"UTR-TEST-{test_suffix.upper()}-1",
            "internal_notes": "First advance tranche received via NEFT."
        }
        print(f"\n[Step 10] Recording partial payment of INR {pay_amount} on invoice...")
        pay_resp = await client.post("/api/v1/payments", json=pay_payload, headers=headers)
        assert pay_resp.status_code == 201, f"Record payment failed: {pay_resp.text}"
        payment_record = pay_resp.json()
        print(f"  [PASS] Payment recorded: ID = {payment_record['id']}")

        # Check updated invoice balance
        inv_check = await client.get(f"/api/v1/invoices/{invoice_id}", headers=headers)
        assert inv_check.status_code == 200
        inv_data = inv_check.json()
        print(f"  [PASS] Invoice balance after partial payment:")
        print(f"    - Amount Paid: INR {inv_data['amountPaid']}")
        print(f"    - Outstanding Balance: INR {inv_data['balanceDue']}")
        print(f"    - Status: {inv_data['status']}")
        assert Decimal(str(inv_data['amountPaid'])) == Decimal(pay_amount)
        assert Decimal(str(inv_data['balanceDue'])) == Decimal("100000.00")
        assert inv_data['status'] == "Partially Paid"

        # 11. Overpayment rejection check
        print("\n[Step 11] Verifying overpayment prevention...")
        overpay_payload = {
            "payment_number": f"REC-OVER-{test_suffix.upper()}",
            "client_id": client_id,
            "invoice_id": invoice_id,
            "amount": "100001.00",  # exceeds 100000.00 balance
            "payment_date": str(today),
            "payment_mode": "NEFT / RTGS / IMPS",
            "transaction_reference": f"UTR-OVER-{test_suffix.upper()}",
            "internal_notes": "Attempting overpayment."
        }
        overpay_resp = await client.post("/api/v1/payments", json=overpay_payload, headers=headers)
        assert overpay_resp.status_code in (409, 422), f"Expected 409 or 422, got {overpay_resp.status_code}: {overpay_resp.text}"
        err_msg = overpay_resp.json().get('detail') or overpay_resp.json().get('error', {}).get('message')
        print(f"  [PASS] Overpayment rejected by backend! Status: {overpay_resp.status_code}, Error: {err_msg}")

        # 12. Record Final Balance Payment
        print("\n[Step 12] Recording final balance payment of INR 100000.00...")
        final_pay_payload = {
            "payment_number": f"REC-TEST-{test_suffix.upper()}-2",
            "client_id": client_id,
            "invoice_id": invoice_id,
            "amount": "100000.00",
            "payment_date": str(today),
            "payment_mode": "NEFT / RTGS / IMPS",
            "transaction_reference": f"UTR-TEST-{test_suffix.upper()}-2",
            "internal_notes": "Final settlement received."
        }
        final_pay_resp = await client.post("/api/v1/payments", json=final_pay_payload, headers=headers)
        assert final_pay_resp.status_code == 201

        inv_check_final = await client.get(f"/api/v1/invoices/{invoice_id}", headers=headers)
        inv_final_data = inv_check_final.json()
        print(f"  [PASS] Final Invoice Status:")
        print(f"    - Amount Paid: INR {inv_final_data['amountPaid']}")
        print(f"    - Outstanding Balance: INR {inv_final_data['balanceDue']}")
        print(f"    - Status: {inv_final_data['status']}")
        assert Decimal(str(inv_final_data['balanceDue'])) == Decimal("0.00")
        assert inv_final_data['status'] == "Paid"

        # 13. Create Expense
        print("\n[Step 13] Creating an operational expense...")
        expense_payload = {
            "expense_number": f"EXP-{test_suffix.upper()}",
            "title": f"Midjourney Pro Subscription {test_suffix}",
            "category": "AI subscriptions and API usage",
            "vendor_or_employee": "Midjourney Inc",
            "department": "Creative",
            "amount": "5000.00",
            "tax_amount": "900.00",
            "expense_date": str(today),
            "payment_method": "Corporate Credit Card",
            "payment_reference": "CC-TXN-99881",
            "status": "Paid",
            "is_recurring": True,
            "recurrence": "Monthly"
        }
        exp_resp = await client.post("/api/v1/expenses", json=expense_payload, headers=headers)
        assert exp_resp.status_code == 201, f"Create expense failed: {exp_resp.text}"
        print(f"  [PASS] Expense logged: ID = {exp_resp.json()['id']}")

        # 14. Create Retainer Contract
        print("\n[Step 14] Creating a recurring retainer contract...")
        retainer_payload = {
            "retainer_name": f"Digital Retainer 2026 {test_suffix}",
            "client_id": client_id,
            "client_name": client_payload["legal_entity_name"],
            "recurring_amount": "75000.00",
            "frequency": "Monthly",
            "start_date": str(today),
            "expiry_date": str(today + timedelta(days=365)),
            "next_billing_date": str(today + timedelta(days=30)),
            "auto_generate_invoice": True,
            "status": "Active"
        }
        ret_resp = await client.post("/api/v1/retainers", json=retainer_payload, headers=headers)
        assert ret_resp.status_code == 201, f"Create retainer failed: {ret_resp.text}"
        print(f"  [PASS] Retainer contract created: ID = {ret_resp.json()['id']}")

        # 15. Create Package with items
        print("\n[Step 15] Creating a service package...")
        package_payload = {
            "name": f"Growth Launch Bundle {test_suffix}",
            "description": "Comprehensive creative and performance production",
            "standard_price": "200000.00",
            "package_discount": "20000.00",
            "final_price": "180000.00",
            "min_price": "160000.00",
            "duration": "1 Month",
            "scope": "Full Launch Production",
            "gst_rate": "18.00",
            "presentation_mode": "Itemized",
            "status": "Active",
            "items": [
                {
                    "service_id": service_id,
                    "quantity": "1.00",
                    "unit": "Per Project",
                    "default_unit_price": "150000.00"
                }
            ]
        }
        pkg_resp = await client.post("/api/v1/packages", json=package_payload, headers=headers)
        assert pkg_resp.status_code == 201, f"Create package failed: {pkg_resp.text}"
        print(f"  [PASS] Package created: ID = {pkg_resp.json()['id']}")

        # 16. Update Company Settings
        print("\n[Step 16] Updating Company Settings...")
        settings_payload = {
            "legal_entity_name": "HEXNS Mediaworks Private Limited",
            "registered_address": "802, Signature Tower, BKC",
            "city": "Mumbai",
            "state": "Maharashtra",
            "state_code": "27",
            "pin_code": "400051",
            "gstin": "27AAACH1234M1Z2",
            "pan": "AAACH1234M",
            "corporate_email": "accounts@hexnsmedia.com",
            "corporate_phone": "+91 22 6123 4567",
            "website": "https://hexnsmedia.com",
            "bank": {
                "bank_name": "HDFC Bank",
                "account_holder": "HEXNS Mediaworks Pvt Ltd",
                "account_number": "50200012345678",
                "ifsc": "HDFC0000123",
                "branch": "BKC Mumbai",
                "upi_vpa": "hexnsmedia@hdfcbank"
            },
            "default_gst_rate": "18.00",
            "default_validity_days": 30,
            "default_payment_terms": "50% Advance with PO, 50% prior to final asset handover / within 7 days",
            "quotation_terms": "1. Standard agency terms apply.\n2. Payment terms 50% advance.",
            "invoice_statutory_note": "Subject to Mumbai Jurisdiction.",
            "quotation_prefix": "HEX-QT-",
            "invoice_prefix": "HEX-INV-",
            "payment_prefix": "HEX-REC-"
        }
        set_resp = await client.put("/api/v1/settings/company", json=settings_payload, headers=headers)
        assert set_resp.status_code == 200, f"Update settings failed: {set_resp.text}"
        print(f"  [PASS] Company settings updated successfully: {set_resp.json()['legalEntityName']}")

        print("\n==================================================")
        print("   ALL 16 LIVE END-TO-END VERIFICATION CHECKS PASSED!")
        print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_end_to_end_verification())
