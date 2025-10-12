import React, { useState } from 'react';
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ChevronDownIcon, ChevronUpIcon } from './components/IconComponents';

interface AuthProps {
    onLogin: (email: string, pass:string) => Promise<string | null>;
    onRegister: (email: string, pass: string, username: string) => Promise<string | null>;
    onResendConfirmation: (email: string) => Promise<string | null>;
    onInfoClick: (content: 'about' | 'faq' | 'contact') => void;
    initialError?: string | null;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister, onResendConfirmation, onInfoClick, initialError }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoginView, setIsLoginView] = useState(true);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [error, setError] = useState(initialError || '');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showResend, setShowResend] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setShowResend(false);

        if (isLoginView) {
            if (!email || !password) {
                setError('Please enter both email and password.');
                return;
            }
            const apiError = await onLogin(email, password);
            if (apiError) {
                setError(apiError);
                if (apiError.toLowerCase().includes('email not confirmed')) {
                    setShowResend(true);
                }
            }
        } else { // Registration flow
            if (!email || !password || !username) {
                setError('Please fill in all fields.');
                return;
            }
            if(username.length < 3) {
                setError('Username must be at least 3 characters.');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters long.');
                return;
            }
            const apiError = await onRegister(email, password, username);
            if (apiError) {
                setError(apiError);
            } else {
                setMessage('Success! Please check your email to confirm your account.');
                setIsSubmitted(true);
            }
        }
    };

    const handleResend = async () => {
        if (!email) {
            setError('Please enter your email address above to resend the link.');
            return;
        }
        setError('');
        setMessage('');
        const apiError = await onResendConfirmation(email);
        if (apiError) {
            setError(apiError);
        } else {
            setMessage('A new confirmation link has been sent to your email.');
        }
        setShowResend(false);
    };

    const toggleAuthView = () => {
        setIsLoginView(!isLoginView);
        setError('');
        setMessage('');
        setIsSubmitted(false);
        setShowResend(false);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    };

    const renderFormContent = () => (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {isSubmitted ? (
                 <div className="text-center p-4 bg-green-900/50 rounded-lg border border-green-700">
                    <h3 className="font-bold text-lg text-white">Registration Submitted!</h3>
                    <p className="mt-2 text-green-300">{message}</p>
                </div>
            ) : (
                <>
                    {!isLoginView && (
                        <div className="relative">
                            <UserIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-4 -translate-y-1/2 pointer-events-none" />
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-700/60 border border-slate-600 rounded-xl py-3 px-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                placeholder="User name"
                                required
                            />
                        </div>
                    )}
                     <div className="relative">
                        <UserIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-4 -translate-y-1/2 pointer-events-none" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-700/60 border border-slate-600 rounded-xl py-3 px-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                            placeholder="Email"
                            required
                        />
                    </div>
                    <div className="relative">
                        <LockClosedIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-4 -translate-y-1/2 pointer-events-none" />
                        <input
                            id="password"
                            type={passwordVisible ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                             className="w-full bg-slate-700/60 border border-slate-600 rounded-xl py-3 px-12 pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                            placeholder="Password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setPasswordVisible(!passwordVisible)}
                            className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-white"
                            aria-label="Toggle password visibility"
                        >
                            {passwordVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </>
            )}

            {!isSubmitted && (
                 <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg">
                    {isLoginView ? 'Log in' : 'Create Account'}
                </button>
            )}
            
            {(error || message) && !isSubmitted && (
                <div className="text-center pt-2">
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {message && <p className="text-sm text-green-300">{message}</p>}
                </div>
            )}

            {showResend && (
                <div className="text-center">
                    <button type="button" onClick={handleResend} className="text-xs font-semibold text-yellow-300 hover:underline">
                        Resend confirmation link?
                    </button>
                </div>
            )}

            <div className="text-center text-sm pt-2">
                <p className="text-slate-400">
                    {isLoginView ? 'Need an account?' : 'Already have an account?'}
                    <button type="button" onClick={toggleAuthView} className="font-semibold text-green-400 hover:underline ml-1">
                         {isLoginView ? 'Sign up' : 'Log in'}
                    </button>
                </p>
            </div>
        </form>
    );
    
    return (
        <div 
            className="min-h-screen bg-slate-900 text-white flex flex-col bg-cover bg-center selection:bg-yellow-400 selection:text-black" 
            style={{ backgroundImage: "url('https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/kikis048%202.png')" }}
        >
            <div className="absolute inset-0 bg-black/30"></div>
            
            <div className="relative z-10 flex flex-col min-h-screen">
                <header className="py-6">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                        <div className="flex items-center gap-3" role="button" aria-label="Vivid Trails Home">
                             <img src="https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/Union%20(1).png" alt="Vivid Trails Icon" className="h-8"/>
                             <img src="https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/graphynovus%20_%20Vivid%20Trails.png" alt="Vivid Trails Wordmark" className="h-5"/>
                        </div>
                        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
                            <button onClick={() => onInfoClick('about')} className="text-slate-200 hover:text-white transition-colors">About</button>
                            <button onClick={() => onInfoClick('faq')} className="text-slate-200 hover:text-white transition-colors">FAQ</button>
                            <button onClick={() => onInfoClick('contact')} className="text-slate-200 hover:text-white transition-colors">Contact</button>
                        </nav>
                    </div>
                </header>

                <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 items-center gap-16">
                    <div className="space-y-4" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
                            Welcome to <span className="text-yellow-300">Vivid Trails</span>
                        </h1>
                        <p className="text-3xl text-slate-200 max-w-lg leading-relaxed font-medium">
                            — your gateway to unforgettable journeys. Explore hidden gems, plan adventures, and capture your travel stories in one vibrant place.
                        </p>
                    </div>
                    {/* The right column is now empty, as the form is positioned absolutely. */}
                </main>
            </div>

            {/* Form Container: Positioned fixed to animate between states */}
            <div className={`
                fixed z-20 w-full max-w-sm transition-all duration-700 ease-in-out
                ${isExpanded 
                    ? 'top-1/2 -translate-y-1/2 right-4 sm:right-6 lg:right-8 xl:right-28 2xl:right-56' 
                    : 'bottom-0 right-4 sm:right-6 lg:right-8 xl:right-28 2xl:right-56'
                }
            `}>
                <div 
                    className={`
                        bg-black/70 backdrop-blur-xl border-white/30 shadow-2xl 
                        transition-all duration-500 ease-in-out
                        ${isExpanded 
                            ? 'rounded-3xl border-4' 
                            : 'rounded-t-3xl border-l-4 border-r-4 border-t-4 border-b-0'
                        }
                    `}
                >
                   <div 
                        className="flex justify-between items-center cursor-pointer p-6"
                        onClick={() => setIsExpanded(!isExpanded)}
                        role="button"
                        aria-expanded={isExpanded}
                        aria-controls="login-form-content"
                    >
                        <h2 className="text-2xl font-bold text-white">{isLoginView ? 'Login' : 'Sign Up'}</h2>
                        <button aria-label={isExpanded ? 'Collapse form' : 'Expand form'} className="text-slate-400 hover:text-white">
                          {isExpanded ? <ChevronDownIcon className="w-6 h-6" /> : <ChevronUpIcon className="w-6 h-6" />}
                        </button>
                    </div>
                    
                    <div 
                      id="login-form-content"
                      className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                        <div className="px-6 pb-6">
                            {renderFormContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;