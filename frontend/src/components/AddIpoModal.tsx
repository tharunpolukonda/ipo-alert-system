import { useState } from 'react'
import { X, Link, CheckCircle, AlertTriangle, Pencil } from 'lucide-react'
import { Sector, iposApi, scrapeApi, GrowwScrapeResult } from '../api'

interface Props {
    sectors: Sector[]
    onClose: () => void
    onCreated: () => void
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

interface FormData {
    company_name: string
    sector_id: string
    sector_name: string
    portfolio: 'yes' | 'no'
    no_of_shares: string
    buy_price: string
    groww_link: string
}

interface ScrapedFields {
    listed_on: string
    issue_price: string
    listing_price: string
    issue_size: string
    qib_subscription: string
    nii_subscription: string
    rii_subscription: string
    total_subscription: string
}

type Step = 1 | 2

export default function AddIpoModal({ sectors, onClose, onCreated, showToast }: Props) {
    const [step, setStep] = useState<Step>(1)
    const [scraping, setScraping] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [scrapeWarning, setScrapeWarning] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [form, setForm] = useState<FormData>({
        company_name: '',
        sector_id: '',
        sector_name: '',
        portfolio: 'no',
        no_of_shares: '',
        buy_price: '',
        groww_link: '',
    })

    const [scraped, setScraped] = useState<ScrapedFields>({
        listed_on: '',
        issue_price: '',
        listing_price: '',
        issue_size: '',
        qib_subscription: '',
        nii_subscription: '',
        rii_subscription: '',
        total_subscription: '',
    })

    const setField = (key: keyof FormData, val: string) => {
        setForm(prev => ({ ...prev, [key]: val }))
        setErrors(prev => ({ ...prev, [key]: '' }))
    }

    const setScrapedField = (key: keyof ScrapedFields, val: string) => {
        setScraped(prev => ({ ...prev, [key]: val }))
    }

    const validate = () => {
        const errs: Record<string, string> = {}
        if (!form.company_name.trim()) errs.company_name = 'Company name is required'
        if (!form.sector_id) errs.sector_id = 'Please select a sector'
        if (!form.groww_link.trim()) errs.groww_link = 'Groww link is required'
        if (form.portfolio === 'yes') {
            if (!form.no_of_shares || isNaN(Number(form.no_of_shares))) errs.no_of_shares = 'Enter a valid number'
            if (!form.buy_price || isNaN(Number(form.buy_price))) errs.buy_price = 'Enter a valid price'
        }
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleProceed = async () => {
        if (!validate()) return
        setScraping(true)
        setScrapeWarning('')
        try {
            const result: GrowwScrapeResult = await scrapeApi.groww(form.groww_link)
            setScraped({
                listed_on: result.listed_on || '',
                issue_price: result.issue_price || '',
                listing_price: result.listing_price || '',
                issue_size: result.issue_size || '',
                qib_subscription: result.qib_subscription || '',
                nii_subscription: result.nii_subscription || '',
                rii_subscription: result.rii_subscription || '',
                total_subscription: result.total_subscription || '',
            })
            if (result.warning) {
                setScrapeWarning(result.warning)
                showToast('Some fields could not be scraped — please review and edit', 'info')
            } else {
                showToast('Data scraped successfully!', 'success')
            }
            setStep(2)
        } catch {
            showToast('Failed to scrape Groww link. Please check the URL and try again.', 'error')
        } finally {
            setScraping(false)
        }
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const selectedSector = sectors.find(s => s.id === form.sector_id)
            await iposApi.create({
                company_name: form.company_name.trim(),
                sector_id: form.sector_id,
                sector_name: selectedSector?.name || form.sector_name,
                portfolio: form.portfolio === 'yes',
                no_of_shares: form.portfolio === 'yes' ? Number(form.no_of_shares) : undefined,
                buy_price: form.portfolio === 'yes' ? Number(form.buy_price) : undefined,
                groww_link: form.groww_link.trim(),
                listed_on: scraped.listed_on || undefined,
                issue_price: scraped.issue_price || undefined,
                listing_price: scraped.listing_price || undefined,
                issue_size: scraped.issue_size || undefined,
                qib_subscription: scraped.qib_subscription || undefined,
                nii_subscription: scraped.nii_subscription || undefined,
                rii_subscription: scraped.rii_subscription || undefined,
                total_subscription: scraped.total_subscription || undefined,
            })
            showToast('IPO added successfully!', 'success')
            onCreated()
            onClose()
        } catch {
            showToast('Failed to save IPO. Please try again.', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-lg">
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)'
                        }}>
                            <Link size={18} />
                        </div>
                        <h2 className="modal-title">Add IPO</h2>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Step Indicator */}
                <div style={{ padding: '16px 28px 0' }}>
                    <div className="steps">
                        <div className={`step-dot ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>
                            {step > 1 ? <CheckCircle size={16} /> : '1'}
                        </div>
                        <div className={`step-line ${step > 1 ? 'completed' : ''}`} />
                        <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        <span>Company Details</span>
                        <span>Review & Submit</span>
                    </div>
                </div>

                <div className="modal-body">
                    {step === 1 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {/* Company Name */}
                            <div className="form-group">
                                <label className="form-label">Company Name *</label>
                                <input className="form-input" placeholder="e.g. Tata Technologies"
                                    value={form.company_name} onChange={e => setField('company_name', e.target.value)} />
                                {errors.company_name && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.company_name}</p>}
                            </div>

                            {/* Sector */}
                            <div className="form-group">
                                <label className="form-label">Sector *</label>
                                <select className="form-select" value={form.sector_id}
                                    onChange={e => {
                                        const sel = sectors.find(s => s.id === e.target.value)
                                        setField('sector_id', e.target.value)
                                        setField('sector_name', sel?.name || '')
                                    }}>
                                    <option value="">Select a sector...</option>
                                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {errors.sector_id && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.sector_id}</p>}
                            </div>

                            {/* Portfolio */}
                            <div className="form-group">
                                <label className="form-label">In Portfolio?</label>
                                <div className="radio-group">
                                    <label className="radio-option">
                                        <input type="radio" name="portfolio" value="yes"
                                            checked={form.portfolio === 'yes'} onChange={() => setField('portfolio', 'yes')} />
                                        Yes — I hold this stock
                                    </label>
                                    <label className="radio-option">
                                        <input type="radio" name="portfolio" value="no"
                                            checked={form.portfolio === 'no'} onChange={() => setField('portfolio', 'no')} />
                                        No — just tracking
                                    </label>
                                </div>
                            </div>

                            {/* Portfolio fields */}
                            {form.portfolio === 'yes' && (
                                <div className="grid-2" style={{ gap: 14 }}>
                                    <div className="form-group">
                                        <label className="form-label">No. of Shares *</label>
                                        <input className="form-input" type="number" placeholder="e.g. 100"
                                            value={form.no_of_shares} onChange={e => setField('no_of_shares', e.target.value)} />
                                        {errors.no_of_shares && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.no_of_shares}</p>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Buy Price (₹) *</label>
                                        <input className="form-input" type="number" placeholder="e.g. 500"
                                            value={form.buy_price} onChange={e => setField('buy_price', e.target.value)} />
                                        {errors.buy_price && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.buy_price}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Groww Link */}
                            <div className="form-group">
                                <label className="form-label">Groww IPO Link *</label>
                                <input className="form-input" placeholder="https://groww.in/ipo/..."
                                    value={form.groww_link} onChange={e => setField('groww_link', e.target.value)} />
                                {errors.groww_link && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.groww_link}</p>}
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Paste the Groww IPO detail page URL. We'll auto-scrape the IPO data.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {scrapeWarning && (
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                    padding: '12px 14px', borderRadius: 8,
                                    background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.25)',
                                    fontSize: 13, color: 'var(--warning)'
                                }}>
                                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{scrapeWarning} Please review and edit fields below before submitting.</span>
                                </div>
                            )}

                            <div style={{
                                padding: '12px 14px', borderRadius: 8,
                                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#60a5fa'
                            }}>
                                <Pencil size={14} />
                                <span>All fields below are editable — correct any scraped values before submitting.</span>
                            </div>

                            <div className="grid-2" style={{ gap: 14 }}>
                                {[
                                    { label: 'Listed On', key: 'listed_on', placeholder: 'DD-MM-YYYY' },
                                    { label: 'Issue Price (₹)', key: 'issue_price', placeholder: 'e.g. 500' },
                                    { label: 'Listing Price (₹)', key: 'listing_price', placeholder: 'e.g. 600' },
                                    { label: 'Issue Size', key: 'issue_size', placeholder: 'e.g. ₹800 Cr' },
                                    { label: 'QIB Subscription', key: 'qib_subscription', placeholder: 'e.g. 4.18x' },
                                    { label: 'NII Subscription', key: 'nii_subscription', placeholder: 'e.g. 2.5x' },
                                    { label: 'RII Subscription', key: 'rii_subscription', placeholder: 'e.g. 1.8x' },
                                    { label: 'Total Subscription', key: 'total_subscription', placeholder: 'e.g. 3.2x' },
                                ].map(({ label, key, placeholder }) => (
                                    <div className="form-group" key={key}>
                                        <label className="form-label">{label}</label>
                                        <input className="form-input" placeholder={placeholder}
                                            value={scraped[key as keyof ScrapedFields]}
                                            onChange={e => setScrapedField(key as keyof ScrapedFields, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {step === 1 ? (
                        <>
                            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleProceed} disabled={scraping}>
                                {scraping ? <span className="spinner" /> : null}
                                {scraping ? 'Scraping...' : 'Proceed →'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? <span className="spinner" /> : null}
                                {submitting ? 'Saving...' : 'Submit'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
