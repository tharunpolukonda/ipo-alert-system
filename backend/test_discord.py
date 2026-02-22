
import os
import logging
from dotenv import load_dotenv
from discord_notifier import send_discord_alert, send_cron_summary

# Setup logging
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()

def test_discord():
    print("--- Testing Discord Alert ---")
    test_alert = {
        "company_name": "Test Company Ltd",
        "sector": "Technology",
        "cmp": 750,
        "issue_price": 700,
        "listing_price": 720,
        "pct_vs_issue": 7.14,
        "pct_vs_listing": 4.17,
        "reasons": ["🟢 CMP is 7.14% above Issue Price", "🟢 Price is holding above Listing Price"]
    }
    
    success = send_discord_alert(test_alert)
    if success:
        print("✅ Alert sent successfully!")
    else:
        print("❌ Failed to send alert. Check logs or DISCORD_WEBHOOK_URL.")

    print("\n--- Testing Cron Summary ---")
    send_cron_summary(total_checked=10, alerts_sent=2)
    print("✅ Summary sent (check your Discord channel).")

if __name__ == "__main__":
    test_discord()
