"""
Groww IPO page scraper using requests + BeautifulSoup.
Scrapes: Listed On, Issue Price, Listing Price, Issue Size,
         QIB, NII, RII, Total subscription rates.

Groww server-side renders IPO data in the HTML, so a plain HTTP
GET + BeautifulSoup is sufficient — no headless browser needed.
"""
import re
import logging
from typing import Optional

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12",
}


def scrape_groww_ipo(url: str) -> dict:
    """
    Scrape IPO details from a Groww IPO page.

    Returns dict with keys:
        listed_on, issue_price, listing_price, issue_size,
        qib_subscription, nii_subscription, rii_subscription, total_subscription,
        success, error, warning
    """
    result = {
        "listed_on": None,
        "issue_price": None,
        "listing_price": None,
        "issue_size": None,
        "qib_subscription": None,
        "nii_subscription": None,
        "rii_subscription": None,
        "total_subscription": None,
        "success": False,
        "error": None,
        "warning": None,
    }

    try:
        log.info(f"Fetching: {url}")
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # ── 1. IPO Details grid ───────────────────────────────────────
        # Each item: div[class*="ipoDetails_detailItem"]
        #   -> child div.bodySmall (label)
        #   -> child div.bodyBaseHeavy (value)
        ipo_details = {}
        for item in soup.find_all("div", class_=re.compile(r"ipoDetails_detailItem")):
            label_el = item.find("div", class_=re.compile(r"bodySmall"))
            value_el = item.find("div", class_=re.compile(r"bodyBaseHeavy"))
            if label_el and value_el:
                label = label_el.get_text(strip=True)
                value = value_el.get_text(strip=True)
                if label and value and label != "IPO document":
                    ipo_details[label] = value

        log.info(f"IPO details: {ipo_details}")

        # ── 2. Subscription rates ─────────────────────────────────────
        # div[class*="subscription_row"] -> span.bodyBase (label) + span.bodyBaseHeavy (value)
        subscription = {}
        for row in soup.find_all("div", class_=re.compile(r"subscription_row__")):
            spans = row.find_all("span")
            if len(spans) >= 2:
                label = spans[0].get_text(strip=True)
                value = spans[-1].get_text(strip=True)
                if label and value:
                    subscription[label] = value

        # Total subscription (different class: subscription_totalRow)
        total_row = soup.find("div", class_=re.compile(r"subscription_totalRow"))
        if total_row:
            spans = total_row.find_all("span")
            if len(spans) >= 2:
                subscription["Total"] = spans[-1].get_text(strip=True)

        log.info(f"Subscription: {subscription}")

        # ── 3. Schedule (listing date) ────────────────────────────────
        # div[class*="ipoSchedule_desktopStepContainer"]
        #   -> span.bodyBase.contentSecondary (date)
        #   -> span.bodyBaseHeavy (label like "Tentative listing date")
        schedule = {}
        for step in soup.find_all("div", class_=re.compile(r"ipoSchedule_desktopStepContainer")):
            info = step.find("div", class_=re.compile(r"ipoSchedule_stepInfoContainer"))
            if info:
                date_el = info.find("span", class_=re.compile(r"bodyBase"))
                label_el = info.find("span", class_=re.compile(r"bodyBaseHeavy"))
                if date_el and label_el:
                    schedule[label_el.get_text(strip=True)] = date_el.get_text(strip=True)

        log.info(f"Schedule: {schedule}")

        # ── Map to result ─────────────────────────────────────────────

        # Listed On / Listing Date
        for key in ["Tentative listing date", "Listing date", "Listed on", "Listing Date"]:
            if key in schedule:
                result["listed_on"] = _format_date(schedule[key])
                break

        # Issue Price (from "Price range" e.g. "₹674 - ₹708" → upper)
        price_raw = ipo_details.get("Price range") or ipo_details.get("Issue Price")
        if price_raw:
            nums = re.findall(r"[\d]+\.?\d*", price_raw.replace(",", ""))
            if nums:
                result["issue_price"] = nums[-1]

        # Listing Price
        listing_raw = ipo_details.get("Listing Price") or ipo_details.get("List Price")
        if listing_raw:
            nums = re.findall(r"[\d]+\.?\d*", listing_raw.replace(",", ""))
            if nums:
                result["listing_price"] = nums[0]

        # Issue Size (e.g. "8,750 Cr")
        size_raw = ipo_details.get("Issue size") or ipo_details.get("Issue Size")
        if size_raw:
            result["issue_size"] = size_raw.strip()

        # Subscription rates
        for key, val in subscription.items():
            kl = key.lower()
            if "qualified" in kl or "qib" in kl:
                result["qib_subscription"] = val
            elif "non-institutional" in kl or "nii" in kl:
                result["nii_subscription"] = val
            elif "retail" in kl or "rii" in kl:
                result["rii_subscription"] = val
            elif kl == "total":
                result["total_subscription"] = val

        # Warning for missing fields
        missing = []
        if not result["listed_on"]:
            missing.append("listing date")
        if not result["issue_price"]:
            missing.append("issue price")
        if not result["issue_size"]:
            missing.append("issue size")

        if len(missing) == 3 and not result["qib_subscription"]:
            result["warning"] = (
                "Could not auto-scrape any data from Groww. "
                "The page structure may have changed — please fill in manually."
            )
        elif missing:
            result["warning"] = f"Could not scrape: {', '.join(missing)}. Please fill in manually."

        result["success"] = True
        log.info(f"Final result: {result}")

    except Exception as e:
        log.error(f"Error scraping Groww: {e}", exc_info=True)
        result["error"] = str(e)
        result["warning"] = f"Scraping failed: {e}. Please fill in manually."
        result["success"] = True  # Let UI show step 2 for manual entry

    return result


def _format_date(raw: str) -> Optional[str]:
    """Convert '19 Feb 2025' or similar to '19-02-2025'."""
    if not raw:
        return None
    raw = raw.strip()
    m = re.match(r"(\d{1,2})\s+([A-Za-z]{3})\s+[']?(\d{2,4})", raw)
    if m:
        day = m.group(1).zfill(2)
        mon = MONTH_MAP.get(m.group(2).lower()[:3], "00")
        year = m.group(3)
        if len(year) == 2:
            year = "20" + year
        return f"{day}-{mon}-{year}"
    return raw
