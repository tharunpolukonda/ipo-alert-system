"""
Alert engine: calculates % gain/loss vs Issue/Listing price,
applies hierarchical rules (company > sector > base), triggers Discord alerts.
"""
import logging
from typing import Optional

log = logging.getLogger(__name__)


def get_rule_for_company(company_doc: dict, all_rules: list) -> dict:
    """
    Return the applicable alert rule for a company.
    Priority: company-specific > sector-specific > base (global).
    Returns dict with keys: gain_pct, loss_pct
    """
    company_name = (company_doc.get("company_name") or "").lower()
    sector_name = (company_doc.get("sector_name") or "").lower()

    # 1. Company-specific rule
    for rule in all_rules:
        if rule.get("type") == "company":
            if (rule.get("company_name") or "").lower() == company_name:
                return {"gain_pct": rule["gain_pct"], "loss_pct": rule["loss_pct"]}

    # 2. Sector-specific rule
    for rule in all_rules:
        if rule.get("type") == "sector":
            if (rule.get("sector_name") or "").lower() == sector_name:
                return {"gain_pct": rule["gain_pct"], "loss_pct": rule["loss_pct"]}

    # 3. Base rule
    for rule in all_rules:
        if rule.get("type") == "base":
            return {"gain_pct": rule["gain_pct"], "loss_pct": rule["loss_pct"]}

    # 4. Absolute default
    return {"gain_pct": 15.0, "loss_pct": -15.0}


def calculate_pct(cmp: float, reference_price: float) -> Optional[float]:
    """Calculate percentage change: (CMP - Ref) * 100 / Ref"""
    if not reference_price or reference_price == 0:
        return None
    return round((cmp - reference_price) * 100 / reference_price, 2)


def check_alerts(ipos: list, rules: list, cmp_map: dict) -> list:
    """
    For each IPO, check if alerts should be triggered.

    Args:
        ipos: list of IPO dicts from Firestore
        rules: list of alert_rule dicts from Firestore
        cmp_map: {company_name: cmp_price} — pre-fetched CMP values

    Returns:
        list of alert dicts to send
    """
    alerts_to_send = []

    for ipo in ipos:
        company_name = ipo.get("company_name")
        cmp = cmp_map.get(company_name)
        if cmp is None:
            log.warning(f"No CMP found for {company_name}, skipping alert check")
            continue

        rule = get_rule_for_company(ipo, rules)
        gain_threshold = rule["gain_pct"]
        loss_threshold = rule["loss_pct"]

        issue_price = _to_float(ipo.get("issue_price"))
        listing_price = _to_float(ipo.get("listing_price"))

        pct_vs_issue = calculate_pct(cmp, issue_price) if issue_price else None
        pct_vs_listing = calculate_pct(cmp, listing_price) if listing_price else None

        triggered = False
        alert_reasons = []

        # Check issue price thresholds
        if pct_vs_issue is not None:
            if pct_vs_issue >= gain_threshold:
                triggered = True
                alert_reasons.append(
                    f"🟢 +{pct_vs_issue:.2f}% vs Issue Price (₹{issue_price}) — above gain threshold of +{gain_threshold}%"
                )
            elif pct_vs_issue <= loss_threshold:
                triggered = True
                alert_reasons.append(
                    f"🔴 {pct_vs_issue:.2f}% vs Issue Price (₹{issue_price}) — below loss threshold of {loss_threshold}%"
                )

        # Check listing price thresholds
        if pct_vs_listing is not None:
            if pct_vs_listing >= gain_threshold:
                triggered = True
                alert_reasons.append(
                    f"🟢 +{pct_vs_listing:.2f}% vs Listing Price (₹{listing_price}) — above gain threshold of +{gain_threshold}%"
                )
            elif pct_vs_listing <= loss_threshold:
                triggered = True
                alert_reasons.append(
                    f"🔴 {pct_vs_listing:.2f}% vs Listing Price (₹{listing_price}) — below loss threshold of {loss_threshold}%"
                )

        if triggered:
            alerts_to_send.append({
                "company_name": company_name,
                "sector": ipo.get("sector_name", "—"),
                "cmp": cmp,
                "issue_price": issue_price,
                "listing_price": listing_price,
                "pct_vs_issue": pct_vs_issue,
                "pct_vs_listing": pct_vs_listing,
                "gain_threshold": gain_threshold,
                "loss_threshold": loss_threshold,
                "reasons": alert_reasons,
            })

    return alerts_to_send


def _to_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        # Remove ₹, commas, spaces
        cleaned = str(val).replace("₹", "").replace(",", "").strip()
        # Handle ranges like "141-148", take first
        cleaned = cleaned.split("-")[0].split("to")[0].strip()
        return float(cleaned)
    except (ValueError, AttributeError):
        return None
