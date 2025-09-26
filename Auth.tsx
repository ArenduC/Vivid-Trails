
import React, { useState } from 'react';
import { MapPinIcon } from './components/IconComponents';

interface AuthProps {
    onLogin: (email: string, pass: string) => Promise<string | null>;
    onRegister: (email: string, pass: string, username: string) => Promise<string | null>;
    onResendConfirmation: (email: string) => Promise<string | null>;
    initialError?: string | null;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister, onResendConfirmation, initialError }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
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

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError('');
        setMessage('');
        setEmail('');
        setPassword('');
        setUsername('');
        setIsSubmitted(false);
        setShowResend(false);
    };
    
    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/travelbg/1920/1080')" }}>
            <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"></div>
            <div className="relative max-w-md w-full bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-gray-700">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                        <MapPinIcon className="h-8 w-8 text-purple-400" />
                        <h1 className="text-3xl font-bold tracking-wider text-white">
                            Vivid Trails
                        </h1>
                    </div>
                    <p className="text-gray-300">{isLoginView ? 'Welcome back.' : 'Share your journey. Discover the world.'}</p>
                </div>
                
                {isSubmitted ? (
                     <div className="text-center p-6 bg-green-900/50 rounded-lg border border-green-700">
                        <h3 className="font-bold text-lg text-white">Registration Submitted!</h3>
                        <p className="mt-2 text-green-300">{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isLoginView ? (
                            <>
                                <div>
                                    <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="email">Email</label>
                                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="you@example.com" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="password">Password</label>
                                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="••••••••" />
                                </div>
                                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg">
                                    Log In
                                </button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="email-reg">Email</label>
                                    <input id="email-reg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="you@example.com" required />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="username">Username</label>
                                    <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="e.g., world_traveler" required />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="password-reg">Password</label>
                                    <input id="password-reg" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="••••••••" required />
                                </div>
                                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg">
                                    Create Account
                                </button>
                            </>
                        )}
                        
                        {(error || message) && (
                            <div className="text-center pt-4">
                                {error && <p className="text-sm text-red-400">{error}</p>}
                                {message && <p className="text-sm text-green-300">{message}</p>}
                            </div>
                        )}

                        {showResend && (
                            <div className="text-center pt-2">
                                <button 
                                    type="button" 
                                    onClick={handleResend}
                                    className="text-sm font-semibold text-purple-400 hover:text-purple-300"
                                >
                                    Resend confirmation link?
                                </button>
                            </div>
                        )}

                    </form>
                )}


                <div className="text-center mt-6">
                    <button onClick={toggleView} className="text-sm text-purple-400 hover:text-purple-300">
                        {isLoginView ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;