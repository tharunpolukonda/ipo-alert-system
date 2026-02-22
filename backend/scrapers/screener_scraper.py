import requests
from bs4 import BeautifulSoup
import re
import logging
import time

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


class StockScraper:
    """Scraper for fetching stock data from screener.in using HTTP requests (no browser needed)"""

    BASE_URL = "https://www.screener.in"
    SEARCH_URL = "https://www.screener.in/api/company/search/"

    def __init__(self, headless=False):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })
        try:
            self.session.get(self.BASE_URL, timeout=10)
            log.info("Session initialized with screener.in cookies")
        except Exception as e:
            log.warning(f"Could not prime session: {e}")

    def _search_company(self, company_name: str):
        search_resp = self.session.get(
            self.SEARCH_URL,
            params={"q": company_name, "v": "3", "fts": "1"},
            headers={
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": self.BASE_URL + "/",
            },
            timeout=15,
        )
        search_resp.raise_for_status()
        results = search_resp.json()
        if not results:
            return None, None
        company = results[0]
        company_url = self.BASE_URL + company["url"]
        found_name = company.get("name", company_name)
        log.info(f"Found: {found_name} → {company_url}")
        return found_name, company_url

    def _fetch_page(self, url: str) -> BeautifulSoup:
        page_resp = self.session.get(
            url,
            headers={"Referer": self.BASE_URL + "/"},
            timeout=20,
        )
        page_resp.raise_for_status()
        return BeautifulSoup(page_resp.text, "html.parser")

    def _parse_number(self, raw: str):
        if not raw:
            return None
        cleaned = re.sub(r"[₹,\s]", "", raw)
        cleaned = cleaned.split("/")[0].strip()
        try:
            return float(cleaned)
        except ValueError:
            return None

    def _extract_top_ratios(self, soup: BeautifulSoup) -> dict:
        ratios = {}
        top_ratios = soup.find("ul", id="top-ratios")
        if not top_ratios:
            return ratios
        for li in top_ratios.find_all("li"):
            name_span = li.find("span", class_="name")
            if not name_span:
                continue
            label = name_span.get_text(strip=True)
            number_spans = li.find_all("span", class_="number")
            values = [s.get_text(strip=True) for s in number_spans]
            ratios[label] = " / ".join(values) if values else ""
        return ratios

    def _extract_price(self, soup: BeautifulSoup):
        try:
            top_ratios = soup.find("ul", id="top-ratios")
            if top_ratios:
                for li in top_ratios.find_all("li"):
                    name_span = li.find("span", class_="name")
                    if name_span and "Current Price" in name_span.get_text():
                        number_span = li.find("span", class_="number")
                        if number_span:
                            raw = number_span.get_text(strip=True)
                            cleaned = re.sub(r"[₹,\s]", "", raw)
                            cleaned = cleaned.split("/")[0].strip()
                            return float(cleaned)
            for span in soup.find_all("span", class_="number"):
                text = re.sub(r"[₹,\s]", "", span.get_text(strip=True))
                text = text.split("/")[0].strip()
                try:
                    val = float(text)
                    if 0.5 < val < 1_000_000:
                        return val
                except ValueError:
                    continue
            return None
        except Exception as e:
            log.error(f"Error extracting price: {e}")
            return None

    def _extract_high_low(self, ratios: dict):
        for key in ratios:
            if "high" in key.lower() and "low" in key.lower():
                raw = ratios[key]
                parts = [p.strip() for p in raw.split("/")]
                high = self._parse_number(parts[0]) if len(parts) > 0 else None
                low = self._parse_number(parts[1]) if len(parts) > 1 else None
                return high, low
        return None, None

    def _extract_description(self, soup: BeautifulSoup) -> str:
        selectors = [
            "div.company-background p",
            "div.about p",
            "#company-background p",
            "section.company-background p",
            "div[id*='background'] p",
            "div[class*='background'] p",
            "div[class*='about'] p",
        ]
        for sel in selectors:
            tag = soup.select_one(sel)
            if tag:
                text = tag.get_text(separator=" ", strip=True)
                if len(text) > 20:
                    return text
        for heading in soup.find_all(["h2", "h3", "h4"], string=re.compile(r"about", re.I)):
            sibling = heading.find_next_sibling("p")
            if sibling:
                text = sibling.get_text(separator=" ", strip=True)
                if len(text) > 20:
                    return text
        return ""

    def scrape_stock_price(self, company_name: str) -> dict:
        result = self.scrape_stock_details(company_name)
        return {
            "company_name": result["company_name"],
            "price": result["price"],
            "success": result["success"],
            "error": result["error"],
        }

    def scrape_stock_details(self, company_name: str) -> dict:
        base_result = {
            "company_name": company_name,
            "price": None,
            "high": None,
            "low": None,
            "market_cap": None,
            "roe": None,
            "roce": None,
            "description": "",
            "success": False,
            "error": None,
        }

        try:
            found_name, company_url = self._search_company(company_name)
            if not found_name:
                base_result["error"] = f'No company found matching "{company_name}" on screener.in'
                return base_result

            base_result["company_name"] = found_name
            soup = self._fetch_page(company_url)
            ratios = self._extract_top_ratios(soup)
            log.info(f"Top-ratio labels found: {list(ratios.keys())}")

            price = self._extract_price(soup)
            base_result["price"] = price

            high, low = self._extract_high_low(ratios)
            base_result["high"] = high
            base_result["low"] = low

            for key, val in ratios.items():
                if "market cap" in key.lower() or "mkt cap" in key.lower():
                    base_result["market_cap"] = val
                    break

            for key, val in ratios.items():
                if key.strip().upper() == "ROE":
                    base_result["roe"] = val
                    break

            for key, val in ratios.items():
                if key.strip().upper() == "ROCE":
                    base_result["roce"] = val
                    break

            base_result["description"] = self._extract_description(soup)

            if price is None:
                base_result["error"] = "Could not extract current price from screener.in page"
            else:
                base_result["success"] = True

            log.info(
                f"{found_name}: price={price}, high={high}, low={low}, "
                f"mkt_cap={base_result['market_cap']}, roe={base_result['roe']}, roce={base_result['roce']}"
            )
            return base_result

        except requests.exceptions.ConnectionError as e:
            base_result["error"] = f"Connection error reaching screener.in: {e}"
        except requests.exceptions.Timeout:
            base_result["error"] = "Request to screener.in timed out — try again shortly"
        except requests.exceptions.HTTPError as e:
            base_result["error"] = f"HTTP error from screener.in: {e}"
        except Exception as e:
            log.error(f"Unexpected error scraping {company_name}: {e}")
            base_result["error"] = str(e)

        return base_result

    def scrape_multiple_stocks(self, company_names: list) -> list:
        results = []
        for i, name in enumerate(company_names):
            result = self.scrape_stock_price(name)
            results.append(result)
            if i < len(company_names) - 1:
                time.sleep(1)
        return results
