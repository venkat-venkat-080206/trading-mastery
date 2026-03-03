import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import './LoginPage.css';

type Mode = 'login' | 'signup';

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setSuccessMsg('Account created! Check your email to confirm your account, then log in.');
                setMode('login');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            {/* Animated background blobs */}
            <div className="auth-blob auth-blob-1" />
            <div className="auth-blob auth-blob-2" />

            <div className="auth-card glass-panel animate-fade-in">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <h1 className="auth-title">Trading Mastery</h1>
                        <p className="auth-subtitle">Your personal learning vault</p>
                    </div>
                </div>

                {/* Tab Toggle */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                    >
                        Sign In
                    </button>
                    <button
                        className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                        onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                    >
                        Create Account
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Email */}
                    <div className="auth-field">
                        <label className="auth-label">Email</label>
                        <div className="auth-input-wrap">
                            <Mail size={16} className="auth-input-icon" />
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="auth-field">
                        <label className="auth-label">Password</label>
                        <div className="auth-input-wrap">
                            <Lock size={16} className="auth-input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="auth-input"
                                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />
                            <button
                                type="button"
                                className="auth-eye-btn"
                                onClick={() => setShowPassword(p => !p)}
                                tabIndex={-1}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error / Success messages */}
                    {error && (
                        <div className="auth-alert auth-alert-error">
                            <AlertCircle size={15} /> {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="auth-alert auth-alert-success">
                            <CheckCircle2 size={15} /> {successMsg}
                        </div>
                    )}

                    {/* Submit */}
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading
                            ? <><Loader2 size={16} className="auth-spin" /> Processing...</>
                            : mode === 'login' ? 'Sign In' : 'Create Account'
                        }
                    </button>
                </form>

                {/* Footer switch */}
                <p className="auth-switch">
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        className="auth-switch-btn"
                        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg(''); }}
                    >
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
}
