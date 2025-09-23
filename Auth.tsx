
import React, { useState } from 'react';
import { SparklesIcon, MapPinIcon } from './components/IconComponents';

interface AuthProps {
    onLogin: (email: string, pass: string) => Promise<string | null>;
    onSendOtp: (email: string) => Promise<string | null>;
    onVerifyAndRegister: (email: string, token: string, username: string) => Promise<string | null>;
    initialError?: string | null;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onSendOtp, onVerifyAndRegister, initialError }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [regStep, setRegStep] = useState<'enter-email' | 'enter-otp'>('enter-email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState(initialError || '');
    const [message, setMessage] = useState('');

    const handleSendOtp = async () => {
        setError('');
        setMessage('');
        if (!email) {
            setError('Please enter your email address.');
            return;
        }
        const apiError = await onSendOtp(email);
        if (apiError) {
            setError(apiError);
        } else {
            setMessage(`A confirmation code has been sent to ${email}. Check your inbox!`);
            setRegStep('enter-otp');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (isLoginView) {
            if (!email || !password) {
                setError('Please enter both email and password.');
                return;
            }
            const apiError = await onLogin(email, password);
            if (apiError) setError(apiError);
        } else { // Registration flow
            if(regStep === 'enter-otp') {
                if (!otp || !username) {
                    setError('Please fill in all fields.');
                    return;
                }
                if(username.length < 3) {
                    setError('Username must be at least 3 characters.');
                    return;
                }
                const apiError = await onVerifyAndRegister(email, otp, username);
                if (apiError) setError(apiError);
            }
        }
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError('');
        setMessage('');
        setRegStep('enter-email');
        setEmail('');
        setPassword('');
        setUsername('');
        setOtp('');
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
                    ) : regStep === 'enter-email' ? (
                        <>
                            <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="email-reg">Email</label>
                                <input id="email-reg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="you@example.com" />
                            </div>
                            <button type="button" onClick={handleSendOtp} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg">
                                Send Confirmation Code
                            </button>
                        </>
                    ) : (
                        <>
                             <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="email-verify">Email</label>
                                <input id="email-verify" type="email" value={email} disabled className="w-full p-3 bg-gray-900/50 rounded-lg border border-gray-600 text-gray-400" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="username">Username</label>
                                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="e.g., world_traveler" />
                            </div>
                             <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="otp">Confirmation Code</label>
                                <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="123456" />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg">
                                Create Account
                            </button>
                        </>
                    )}
                    
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    {message && <p className="text-sm text-green-400 text-center">{message}</p>}

                </form>

                <div className="text-center mt-6">
                    <button onClick={toggleView} className="text-sm text-purple-400 hover:text-purple-300">
                        {isLoginView ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                    </button>
                </div>
                 {!isLoginView && regStep === 'enter-otp' &&
                    <div className="text-center mt-4">
                        <button type="button" onClick={handleSendOtp} className="text-xs text-gray-400 hover:text-gray-200">
                            Didn't get a code? Resend
                        </button>
                    </div>
                }
            </div>
        </div>
    );
};

export default Auth;
