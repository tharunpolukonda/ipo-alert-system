"""
Discord webhook notifier — sends rich embed alert messages.
"""
import os
import requests
import logging
from typing import Optional

log = logging.getLogger(__name__)


def send_discord_alert(alert: dict) -> bool:
    """
    Send a Discord embed message for a triggered alert.

    Args:
        alert: dict with keys: company_name, sector, cmp, issue_price,
               listing_price, pct_vs_issue, pct_vs_listing, reasons

    Returns:
        True if sent successfully, False otherwise.
    """
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        log.error("DISCORD_WEBHOOK_URL not set — cannot send alert")
        return False

    company = alert["company_name"]
    cmp = alert["cmp"]
    pct_issue = alert.get("pct_vs_issue")
    pct_listing = alert.get("pct_vs_listing")

    # Color: green for gain, red for loss
    all_positive = all(
        "🟢" in reason for reason in alert.get("reasons", [])
    )
    color = 0x2ECC71 if all_positive else 0xE74C3C  # green or red

    fields = [
        {"name": "📈 CMP", "value": f"₹{cmp}", "inline": True},
        {"name": "🏭 Sector", "value": alert.get("sector", "—"), "inline": True},
    ]

    if alert.get("issue_price"):
        pct_str = f"{'+' if pct_issue and pct_issue >= 0 else ''}{pct_issue:.2f}%" if pct_issue is not None else "N/A"
        fields.append({
            "name": "💰 Issue Price",
            "value": f"₹{alert['issue_price']} | {pct_str}",
            "inline": True,
        })

    if alert.get("listing_price"):
        pct_str2 = f"{'+' if pct_listing and pct_listing >= 0 else ''}{pct_listing:.2f}%" if pct_listing is not None else "N/A"
        fields.append({
            "name": "🏁 Listing Price",
            "value": f"₹{alert['listing_price']} | {pct_str2}",
            "inline": True,
        })

    # Alert reasons
    reason_text = "\n".join(alert.get("reasons", []))
    if reason_text:
        fields.append({"name": "⚠️ Alert Reasons", "value": reason_text, "inline": False})

    payload = {
        "username": "IPO Tracker Bot",
        "avatar_url": "https://cdn-icons-png.flaticon.com/512/2830/2830284.png",
        "embeds": [
            {
                "title": f"🚨 IPO Alert — {company}",
                "color": color,
                "fields": fields,
                "footer": {"text": "IPO Tracker | Powered by Screener.in"},
            }
        ],
    }

    try:
        resp = requests.post(webhook_url, json=payload, timeout=10)
        resp.raise_for_status()
        log.info(f"Discord alert sent for {company}")
        return True
    except requests.exceptions.RequestException as e:
        log.error(f"Failed to send Discord alert for {company}: {e}")
        return False


def send_cron_summary(total_checked: int, alerts_sent: int) -> None:
    """Send a summary message after cron job runs."""
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        return

    payload = {
        "username": "IPO Tracker Bot",
        "content": (
            f"✅ **Daily Alert Check Complete**\n"
            f"• Stocks checked: **{total_checked}**\n"
            f"• Alerts triggered: **{alerts_sent}**"
        ),
    }
    try:
        requests.post(webhook_url, json=payload, timeout=10)
    except Exception:
        pass
