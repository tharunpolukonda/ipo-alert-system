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


import json

def scrape_closed_ipos() -> list:
    """
    Scrape the list of closed IPOs from Groww.
    Returns a list of dicts: [{company_name, search_id, groww_link, is_listed, ...}]
    """
    url = "https://groww.in/ipo/closed"
    try:
        log.info(f"Fetching closed IPOs from: {url}")
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        script_tag = soup.find("script", id="__NEXT_DATA__")
        if not script_tag:
            log.error("Could not find __NEXT_DATA__ script tag")
            return []

        data = json.loads(script_tag.string)
        # Navigate to the data list: props -> pageProps -> dataList
        data_list = data.get("props", {}).get("pageProps", {}).get("dataList", [])
        
        results = []
        for item in data_list:
            # We only care about listed companies as per user request
            if not item.get("isListed"):
                continue
                
            search_id = item.get("searchId")
            company_name = item.get("companyName", "")
            
            # Add "Ltd" if not present
            if company_name and not (company_name.endswith("Ltd") or company_name.endswith("Limited")):
                company_name = company_name.strip() + " Ltd"

            results.append({
                "company_name": company_name,
                "search_id": search_id,
                "groww_link": f"https://groww.in/ipo/{search_id}",
                "is_sme": item.get("isSme", False),
                "issue_price": str(item.get("issuePrice") or ""),
                "listing_price": str(item.get("listingPrice") or ""),
                "listed_on": str(item.get("listingTimestamp") or ""), # This is a timestamp, might need conversion
                "overall_subscription": str(item.get("overallSubscription") or ""),
            })
            
        return results
    except Exception as e:
        log.error(f"Error scraping closed IPOs: {e}")
        return []

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
        ipo_details = {}
        # The user provided a snippet with ipoDetails_detailItem__uFyIn
        # We'll use a broader regex to match similar classes
        for item in soup.find_all("div", class_=re.compile(r"ipoDetails_detailItem")):
            # Label is usually in bodySmall or contentSecondary
            label_el = item.find("div", class_=re.compile(r"bodySmall|contentSecondary"))
            # Value is usually in bodyBaseHeavy
            value_el = item.find("div", class_=re.compile(r"bodyBaseHeavy"))
            
            if label_el and value_el:
                label = label_el.get_text(strip=True).lower()
                value = value_el.get_text(strip=True)
                if label and value and label != "ipo document":
                    ipo_details[label] = value

        log.info(f"IPO details keys found: {list(ipo_details.keys())}")

        # ── 2. Subscription rates ─────────────────────────────────────
        subscription = {}
        for row in soup.find_all("div", class_=re.compile(r"subscription_row__")):
            spans = row.find_all("span")
            if len(spans) >= 2:
                label = spans[0].get_text(strip=True).lower()
                value = spans[-1].get_text(strip=True)
                if label and value:
                    subscription[label] = value

        total_row = soup.find("div", class_=re.compile(r"subscription_totalRow"))
        if total_row:
            spans = total_row.find_all("span")
            if len(spans) >= 2:
                subscription["total"] = spans[-1].get_text(strip=True)

        # ── 3. Schedule (listing date) ────────────────────────────────
        schedule = {}
        for step in soup.find_all("div", class_=re.compile(r"ipoSchedule_desktopStepContainer")):
            info = step.find("div", class_=re.compile(r"ipoSchedule_stepInfoContainer"))
            if info:
                date_el = info.find("span", class_=re.compile(r"bodyBase"))
                label_el = info.find("span", class_=re.compile(r"bodyBaseHeavy"))
                if date_el and label_el:
                    schedule[label_el.get_text(strip=True).lower()] = date_el.get_text(strip=True)

        # ── Map to result ─────────────────────────────────────────────

        # Listed On / Listing Date
        for key in ["tentative listing date", "listing date", "listed on"]:
            if key in schedule:
                result["listed_on"] = _format_date(schedule[key])
                break
        if not result["listed_on"]:
            if "listed on" in ipo_details:
                result["listed_on"] = _format_date(ipo_details["listed on"])

        # Issue Price
        price_raw = ipo_details.get("price range") or ipo_details.get("issue price")
        if price_raw:
            nums = re.findall(r"[\d]+\.?\d*", price_raw.replace(",", ""))
            if nums:
                result["issue_price"] = nums[-1]

        # Listing Price (be case-insensitive and check both places)
        listing_raw = ipo_details.get("listing price") or ipo_details.get("list price")
        if listing_raw:
            nums = re.findall(r"[\d]+\.?\d*", listing_raw.replace(",", ""))
            if nums:
                result["listing_price"] = nums[0]

        # Issue Size
        size_raw = ipo_details.get("issue size")
        if size_raw:
            result["issue_size"] = size_raw.strip()

        # Subscription rates
        for key, val in subscription.items():
            if "qualified" in key or "qib" in key:
                result["qib_subscription"] = val
            elif "non-institutional" in key or "nii" in key:
                result["nii_subscription"] = val
            elif "retail" in key or "rii" in key:
                result["rii_subscription"] = val
            elif key == "total":
                result["total_subscription"] = val

        # Handle missing fields
        missing = [k for k, v in result.items() if v is None and k not in ["success", "error", "warning"]]
        if len(missing) > 5: # Arbitrary threshold
             result["warning"] = "The page structure may have changed — please check the data."

        result["success"] = True
    except Exception as e:
        log.error(f"Error scraping Groww: {e}", exc_info=True)
        result["error"] = str(e)
        result["success"] = True # Still success so UI proceeds to manual correction

    return result


def _format_date(raw: str) -> Optional[str]:
    """Convert '19 Feb 2025' or similar to '19-02-2025'."""
    if not raw:
        return None
    raw = raw.strip()
    # Handle timestamps (from __NEXT_DATA__)
    if raw.isdigit():
        from datetime import datetime
        try:
            dt = datetime.fromtimestamp(int(raw) / 1000.0)
            return dt.strftime("%d-%m-%Y")
        except:
            return raw
            
    m = re.match(r"(\d{1,2})\s+([A-Za-z]{3})\s+[']?(\d{2,4})", raw)
    if m:
        day = m.group(1).zfill(2)
        mon = MONTH_MAP.get(m.group(2).lower()[:3], "00")
        year = m.group(3)
        if len(year) == 2:
            year = "20" + year
        return f"{day}-{mon}-{year}"
    return raw
