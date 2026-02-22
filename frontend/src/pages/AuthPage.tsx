import { useState } from 'react'
import { BarChart3, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
    onAuthSuccess: () => void
}

export default function AuthPage({ onAuthSuccess }: Props) {
    const [tab, setTab] = useState<'login' | 'signup'>('login')
    const [form, setForm] = useState({ username: '', email: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = (field: string, value: string) =>
        setForm(f => ({ ...f, [field]: value }))

    // ── Login: look up email from username, then sign in ───────────
    const handleLogin = async () => {
        setError(null)
        if (!form.username.trim() || !form.password) {
            setError('Username and password are required'); return
        }
        setLoading(true)
        try {
            // 1. Resolve email from username
            const { data: profiles, error: lookupErr } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('username', form.username.trim())
                .single()

            if (lookupErr || !profiles?.email) {
                setError('Username not found. Please check your username or sign up.'); return
            }

            // 2. Sign in with resolved email
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: profiles.email,
                password: form.password,
            })

            if (signInErr) {
                setError(signInErr.message === 'Invalid login credentials'
                    ? 'Wrong password. Please try again.'
                    : signInErr.message)
                return
            }

            onAuthSuccess()
        } catch (e: unknown) {
            if (e instanceof TypeError && e.message.includes('fetch')) {
                setError('Cannot reach Supabase. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local are correct, then restart npm run dev.')
            } else {
                setError(e instanceof Error ? e.message : 'Unexpected error. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    // ── Signup: create account with email + store username in metadata ─
    const handleSignup = async () => {
        setError(null)
        if (!form.username.trim() || !form.email.trim() || !form.password) {
            setError('All fields are required'); return
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters'); return
        }
        if (!/\S+@\S+\.\S+/.test(form.email)) {
            setError('Please enter a valid email'); return
        }
        setLoading(true)
        try {
            // Check if username already taken (best-effort — skip if table not ready)
            const { data: existing, error: checkErr } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('username', form.username.trim())
                .single()

            if (!checkErr && existing) {
                setError('Username already taken. Please choose a different one.'); return
            }

            // Sign up — the trigger auto-creates user_profiles with username from metadata
            const { error: signUpErr } = await supabase.auth.signUp({
                email: form.email.trim(),
                password: form.password,
                options: {
                    data: { username: form.username.trim() }
                }
            })

            if (signUpErr) {
                setError(signUpErr.message); return
            }

            onAuthSuccess()
        } catch (e: unknown) {
            if (e instanceof TypeError && e.message.includes('fetch')) {
                setError('Cannot reach Supabase. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local are correct, then restart npm run dev.')
            } else {
                setError(e instanceof Error ? e.message : 'Unexpected error. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', padding: 20, position: 'relative',
        }}>
            <div className="glow-bg" />

            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                        <img
                            src="/assets/bull_premium_1771778168693.png"
                            alt="Bull"
                            style={{ width: 80, height: 'auto', filter: 'drop-shadow(0 0 15px var(--accent-blue-glow))' }}
                        />
                        <img
                            src="/assets/bear_blue_premium_1771777968054.png"
                            alt="Bear"
                            style={{ width: 80, height: 'auto', filter: 'drop-shadow(0 0 15px var(--danger-bg))' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                        <img
                            src="/assets/hoox_logo_premium_1771778134217.png"
                            alt="Logo"
                            style={{ width: 64, height: 'auto' }}
                        />
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
                        Premium IPO Analytics & Real-time Alerts
                    </p>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: 32 }}>
                    {/* Tab toggle */}
                    <div style={{
                        display: 'flex', background: 'var(--bg-input)', borderRadius: 10,
                        padding: 4, marginBottom: 28, border: '1px solid var(--border)',
                    }}>
                        {(['login', 'signup'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setError(null) }}
                                style={{
                                    flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                                    cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                                    background: tab === t ? 'var(--accent-blue)' : 'transparent',
                                    color: tab === t ? 'white' : 'var(--text-muted)',
                                }}
                            >
                                {t === 'login' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Username field (always shown) */}
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                className="form-input"
                                placeholder={tab === 'login' ? 'Enter your username' : 'Choose a username'}
                                value={form.username}
                                onChange={e => set('username', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
                                autoFocus
                            />
                        </div>

                        {/* Email — only on signup */}
                        {tab === 'signup' && (
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={e => set('email', e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                                />
                            </div>
                        )}

                        {/* Password */}
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder={tab === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                                    value={form.password}
                                    onChange={e => set('password', e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
                                    style={{ paddingRight: 44 }}
                                />
                                <button
                                    onClick={() => setShowPass(s => !s)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)', background: 'none', border: 'none',
                                        cursor: 'pointer', display: 'flex', padding: 0,
                                    }}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                                color: 'var(--danger)',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '12px 0', fontSize: 15 }}
                            onClick={tab === 'login' ? handleLogin : handleSignup}
                            disabled={loading}
                        >
                            {loading
                                ? <><span className="spinner" /> {tab === 'login' ? 'Signing in...' : 'Creating account...'}</>
                                : tab === 'login' ? 'Sign In' : 'Create Account'
                            }
                        </button>

                        {/* Switch hint */}
                        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(null) }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                            >
                                {tab === 'login' ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
