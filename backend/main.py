"""
Main FastAPI application for IPO Tracker/Alert.
Uses Supabase (PostgreSQL) as the database via supabase-py client.
All IPO and alert_rule endpoints require an x-user-id header and scope
data to that user. Sectors are shared / global.
"""
import os
import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import get_db
from scrapers.groww_scraper import scrape_groww_ipo
from scrapers.screener_scraper import StockScraper
from alert_engine import check_alerts, calculate_pct
from discord_notifier import send_discord_alert, send_cron_summary

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="IPO Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scraper = StockScraper()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_user(x_user_id: Optional[str]) -> str:
    """Extract and validate the user ID from the x-user-id header."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header. Please log in.")
    return x_user_id


# ═══════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════

class SectorCreate(BaseModel):
    name: str

class IpoCreate(BaseModel):
    company_name: str
    sector_id: Optional[str] = None
    sector_name: Optional[str] = None
    portfolio: bool = False
    no_of_shares: Optional[float] = None
    buy_price: Optional[float] = None
    groww_link: Optional[str] = None
    listed_on: Optional[str] = None
    issue_price: Optional[str] = None
    listing_price: Optional[str] = None
    issue_size: Optional[str] = None
    qib_subscription: Optional[str] = None
    nii_subscription: Optional[str] = None
    rii_subscription: Optional[str] = None
    total_subscription: Optional[str] = None

class IpoUpdate(BaseModel):
    company_name: Optional[str] = None
    sector_id: Optional[str] = None
    sector_name: Optional[str] = None
    portfolio: Optional[bool] = None
    no_of_shares: Optional[float] = None
    buy_price: Optional[float] = None
    groww_link: Optional[str] = None
    listed_on: Optional[str] = None
    issue_price: Optional[str] = None
    listing_price: Optional[str] = None
    issue_size: Optional[str] = None
    qib_subscription: Optional[str] = None
    nii_subscription: Optional[str] = None
    rii_subscription: Optional[str] = None
    total_subscription: Optional[str] = None

class ScrapeGrowwRequest(BaseModel):
    url: str

class AlertRuleCreate(BaseModel):
    type: str  # "base" | "sector" | "company"
    sector_id: Optional[str] = None
    sector_name: Optional[str] = None
    company_name: Optional[str] = None
    gain_pct: float = 15.0
    loss_pct: float = -15.0

class AlertRuleUpdate(BaseModel):
    gain_pct: Optional[float] = None
    loss_pct: Optional[float] = None
    sector_id: Optional[str] = None
    sector_name: Optional[str] = None
    company_name: Optional[str] = None


# ═══════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": now_iso()}


# ═══════════════════════════════════════════════════════════
# Sectors  (global — no user scoping)
# ═══════════════════════════════════════════════════════════

@app.get("/api/sectors")
def list_sectors():
    db = get_db()
    resp = db.table("sectors").select("*").order("name").execute()
    return resp.data


@app.post("/api/sectors", status_code=201)
def create_sector(body: SectorCreate):
    db = get_db()
    existing = db.table("sectors").select("id").eq("name", body.name).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Sector with this name already exists")
    data = {"name": body.name.strip(), "created_at": now_iso()}
    resp = db.table("sectors").insert(data).execute()
    return resp.data[0]


@app.delete("/api/sectors/{sector_id}")
def delete_sector(sector_id: str):
    db = get_db()
    db.table("sectors").delete().eq("id", sector_id).execute()
    return {"message": "Sector deleted"}


# ═══════════════════════════════════════════════════════════
# IPOs  (scoped to user)
# ═══════════════════════════════════════════════════════════

@app.get("/api/ipos")
def list_ipos(portfolio_only: bool = False, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    query = db.table("ipos").select("*").eq("user_id", user_id).order("created_at", desc=True)
    if portfolio_only:
        query = query.eq("portfolio", True)
    resp = query.execute()
    return resp.data


@app.post("/api/ipos", status_code=201)
def create_ipo(body: IpoCreate, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    data = body.model_dump()
    data["user_id"] = user_id
    data["created_at"] = now_iso()
    resp = db.table("ipos").insert(data).execute()
    return resp.data[0]


@app.get("/api/ipos/{ipo_id}")
def get_ipo(ipo_id: str, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    resp = db.table("ipos").select("*").eq("id", ipo_id).eq("user_id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="IPO not found")
    return resp.data[0]


@app.put("/api/ipos/{ipo_id}")
def update_ipo(ipo_id: str, body: IpoUpdate, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    resp = db.table("ipos").update(updates).eq("id", ipo_id).eq("user_id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="IPO not found")
    return resp.data[0]


@app.delete("/api/ipos/{ipo_id}")
def delete_ipo(ipo_id: str, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    db.table("ipos").delete().eq("id", ipo_id).eq("user_id", user_id).execute()
    return {"message": "IPO deleted"}


# ═══════════════════════════════════════════════════════════
# Scraping
# ═══════════════════════════════════════════════════════════

@app.post("/api/scrape/groww")
def scrape_groww(body: ScrapeGrowwRequest):
    result = scrape_groww_ipo(body.url)
    if not result["success"]:
        result["warning"] = result.get("error", "Some fields could not be scraped automatically")
        result["error"] = None
    return result


@app.get("/api/scrape/cmp/{company_name}")
def get_cmp(company_name: str):
    result = scraper.scrape_stock_price(company_name)
    if not result["success"]:
        log.warning(f"CMP scrape failed for {company_name}: {result.get('error')}")
    return result


@app.post("/api/scrape/cmp/bulk")
def get_cmp_bulk(body: dict):
    names = body.get("company_names", [])
    if not names:
        return []
    return scraper.scrape_multiple_stocks(names)


# ═══════════════════════════════════════════════════════════
# Alert Rules  (scoped to user)
# ═══════════════════════════════════════════════════════════

@app.get("/api/alert-rules")
def list_alert_rules(x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    resp = db.table("alert_rules").select("*").eq("user_id", user_id).order("created_at").execute()
    return resp.data


@app.post("/api/alert-rules", status_code=201)
def create_alert_rule(body: AlertRuleCreate, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()

    # Generic duplicate check based on type
    existing_id = None
    if body.type == "base":
        existing = db.table("alert_rules").select("id").eq("type", "base").eq("user_id", user_id).execute()
        if existing.data:
            existing_id = existing.data[0]["id"]
    elif body.type == "sector" and body.sector_id:
        existing = db.table("alert_rules").select("id").eq("type", "sector").eq("sector_id", body.sector_id).eq("user_id", user_id).execute()
        if existing.data:
            existing_id = existing.data[0]["id"]
    elif body.type == "company" and body.company_name:
        existing = db.table("alert_rules").select("id").eq("type", "company").eq("company_name", body.company_name).eq("user_id", user_id).execute()
        if existing.data:
            existing_id = existing.data[0]["id"]

    if existing_id:
        # Upsert: Update existing rule
        updates = {
            "gain_pct": body.gain_pct,
            "loss_pct": body.loss_pct,
            "updated_at": now_iso()
        }
        # For sector/company matches, also ensure names match if they might have changed
        if body.sector_name: updates["sector_name"] = body.sector_name
        if body.company_name: updates["company_name"] = body.company_name
        
        resp = db.table("alert_rules").update(updates).eq("id", existing_id).execute()
        return resp.data[0]

    # Create new rule
    data = body.model_dump()
    data["user_id"] = user_id
    data["created_at"] = now_iso()
    resp = db.table("alert_rules").insert(data).execute()
    return resp.data[0]


@app.put("/api/alert-rules/{rule_id}")
def update_alert_rule(rule_id: str, body: AlertRuleUpdate, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    resp = db.table("alert_rules").update(updates).eq("id", rule_id).eq("user_id", user_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return resp.data[0]


@app.delete("/api/alert-rules/{rule_id}")
def delete_alert_rule(rule_id: str, x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    db.table("alert_rules").delete().eq("id", rule_id).eq("user_id", user_id).execute()
    return {"message": "Alert rule deleted"}


# ═══════════════════════════════════════════════════════════
# Cron Job — Check Alerts  (server-to-server, no user scope)
# ═══════════════════════════════════════════════════════════

@app.post("/api/cron/check-alerts")
def run_alert_check(x_cron_secret: Optional[str] = Header(None)):
    expected_secret = os.environ.get("CRON_SECRET", "")
    if expected_secret and x_cron_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret")

    db = get_db()

    # Fetch all portfolio IPOs across all users
    ipos = db.table("ipos").select("*").eq("portfolio", True).execute().data
    if not ipos:
        return {"message": "No portfolio IPOs found", "alerts_sent": 0}

    company_names = [ipo["company_name"] for ipo in ipos]
    cmp_results = scraper.scrape_multiple_stocks(company_names)
    cmp_map = {r["company_name"]: r["price"] for r in cmp_results if r.get("price")}

    rules = db.table("alert_rules").select("*").execute().data
    if not any(r.get("type") == "base" for r in rules):
        rules.append({"type": "base", "gain_pct": 15.0, "loss_pct": -15.0})

    alerts = check_alerts(ipos, rules, cmp_map)
    sent_count = sum(1 for alert in alerts if send_discord_alert(alert))
    send_cron_summary(len(ipos), sent_count)

    log.info(f"Cron: {len(ipos)} IPOs checked, {sent_count} alerts sent")
    return {
        "message": "Alert check complete",
        "ipos_checked": len(ipos),
        "cmp_fetched": len(cmp_map),
        "alerts_triggered": len(alerts),
        "alerts_sent": sent_count,
    }


# ═══════════════════════════════════════════════════════════
# Portfolio Summary  (scoped to user)
# ═══════════════════════════════════════════════════════════

@app.get("/api/portfolio/summary")
def portfolio_summary(x_user_id: Optional[str] = Header(None)):
    user_id = require_user(x_user_id)
    db = get_db()
    portfolio_ipos = (
        db.table("ipos").select("*").eq("user_id", user_id).eq("portfolio", True).execute().data
    )

    if not portfolio_ipos:
        return {
            "companies": [],
            "total_invested": 0,
            "total_current_value": 0,
            "total_pct_change": 0,
        }

    company_names = [ipo["company_name"] for ipo in portfolio_ipos]
    cmp_results = scraper.scrape_multiple_stocks(company_names)
    cmp_map = {r["company_name"]: r["price"] for r in cmp_results if r.get("price")}

    companies = []
    total_invested = 0.0
    total_current_value = 0.0

    for ipo in portfolio_ipos:
        name = ipo["company_name"]
        shares = float(ipo.get("no_of_shares") or 0)
        buy_price = float(ipo.get("buy_price") or 0)
        cmp = cmp_map.get(name)

        invested = shares * buy_price
        current_val = (shares * cmp) if cmp else None
        pct_change = calculate_pct(cmp, buy_price) if (cmp and buy_price) else None

        total_invested += invested
        if current_val is not None:
            total_current_value += current_val

        companies.append({
            "id": ipo["id"],
            "company_name": name,
            "sector": ipo.get("sector_name") or "—",
            "sector_id": ipo.get("sector_id"),
            "shares": shares,
            "buy_price": buy_price,
            "cmp": cmp,
            "invested": invested,
            "current_value": current_val,
            "pct_change": pct_change,
            "issue_price": ipo.get("issue_price"),
            "listing_price": ipo.get("listing_price"),
            "listed_on": ipo.get("listed_on"),
        })

    total_pct = calculate_pct(total_current_value, total_invested) if total_invested else 0

    return {
        "companies": companies,
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current_value, 2),
        "total_pct_change": round(total_pct, 2) if total_pct else 0,
    }
