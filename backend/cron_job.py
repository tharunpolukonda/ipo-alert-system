import os
import logging
from database import get_db
from scrapers.screener_scraper import StockScraper
from alert_engine import check_alerts
from discord_notifier import send_discord_alert, send_cron_summary

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_cron():
    """Main cron job entry point."""
    logger.info("Starting automated IPO alert check...")
    
    try:
        db = get_db()
        
        # 1. Fetch all IPOs from Supabase
        logger.info("Fetching IPOs...")
        ipo_resp = db.table("ipos").select("*").execute()
        ipos = ipo_resp.data
        if not ipos:
            logger.info("No IPOs found in database. Exiting.")
            return

        # 2. Fetch all alert rules
        logger.info("Fetching alert rules...")
        rule_resp = db.table("alert_rules").select("*").execute()
        rules = rule_resp.data

        # 3. Fetch CMP for all companies using StockScraper (BeautifulSoup)
        scraper = StockScraper()
        cmp_map = {}
        unique_companies = list(set([ipo['company_name'] for ipo in ipos]))
        
        logger.info(f"Gathering CMP for {len(unique_companies)} companies...")
        for name in unique_companies:
            result = scraper.scrape_stock_price(name)
            if result['success'] and result['price'] is not None:
                cmp_map[name] = result['price']
            else:
                logger.warning(f"Could not fetch CMP for {name}: {result['error']}")

        # 4. Check for triggered alerts
        logger.info("Checking alert rules...")
        triggered_alerts = check_alerts(ipos, rules, cmp_map)
        
        # 5. Send alerts to Discord
        alerts_sent = 0
        for alert in triggered_alerts:
            success = send_discord_alert(alert)
            if success:
                alerts_sent += 1

        # 6. Send summary
        send_cron_summary(len(unique_companies), alerts_sent)
        logger.info(f"Cron check complete. Checked {len(unique_companies)} stocks, sent {alerts_sent} alerts.")

    except Exception as e:
        logger.error(f"FATAL ERROR in cron job: {e}")

if __name__ == "__main__":
    run_cron()
