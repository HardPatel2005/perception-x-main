import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Use auth context login method
            login(data.user, data.token);

            // Navigate to home
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
            <div 
                className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1" 
                style={{ 
                    position: 'relative', 
                    zIndex: 10,
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                    paddingTop: '80px'
                }}
            >
            <div className="max-w-md w-full">
                <div 
                    className="rounded-2xl bg-white p-10 shadow-2xl" 
                    style={{ 
                        border: '1px solid rgba(0, 0, 0, 0.06)', 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                        backgroundColor: '#ffffff'
                    }}
                >
                    <div className="text-center mb-10">
                        <h2 
                            className="text-3xl font-semibold mb-3 tracking-tight" 
                            style={{ 
                                color: '#000000', 
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                fontWeight: 600,
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Sign in to your account
                        </h2>
                        <p 
                            className="text-sm" 
                            style={{ 
                                color: '#6b7280', 
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontWeight: 400
                            }}
                        >
                            Enter your credentials to access your account
                        </p>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div 
                                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" 
                                style={{ 
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    fontWeight: 500
                                }}
                            >
                                {error}
                            </div>
                        )}
                        <div className="space-y-5">
                            <div>
                                <label 
                                    htmlFor="email" 
                                    className="block text-sm font-medium mb-2" 
                                    style={{ 
                                        color: '#111827', 
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        fontWeight: 500
                                    }}
                                >
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border text-sm transition-all duration-200"
                                    style={{
                                        borderColor: 'rgba(0, 0, 0, 0.15)',
                                        backgroundColor: '#ffffff',
                                        color: '#111827',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        outline: 'none',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#2a2a2a'
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(42, 42, 42, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)'
                                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                />
                            </div>
                            <div>
                                <label 
                                    htmlFor="password" 
                                    className="block text-sm font-medium mb-2" 
                                    style={{ 
                                        color: '#111827', 
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        fontWeight: 500
                                    }}
                                >
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border text-sm transition-all duration-200"
                                    style={{
                                        borderColor: 'rgba(0, 0, 0, 0.15)',
                                        backgroundColor: '#ffffff',
                                        color: '#111827',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        outline: 'none',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#2a2a2a'
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(42, 42, 42, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)'
                                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 px-6 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                style={{
                                    background: loading ? '#9ca3af' : '#111827',
                                    color: '#ffffff',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    fontWeight: 600,
                                    fontSize: '15px',
                                    boxShadow: loading ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.background = '#000000'
                                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.background = '#111827'
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }
                                }}
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>

                        <div className="text-center pt-4">
                            <span 
                                className="text-sm"
                                style={{ 
                                    color: '#6b7280',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                }}
                            >
                                Don't have an account?{' '}
                            </span>
                            <a 
                                href="/signup" 
                                className="text-sm font-semibold transition-colors"
                                style={{ 
                                    color: '#111827',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#000000'
                                    e.currentTarget.style.textDecoration = 'underline'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#111827'
                                    e.currentTarget.style.textDecoration = 'none'
                                }}
                            >
                                Sign up
                            </a>
                        </div>
                    </form>
                </div>
            </div>
            </div>
            <Footer />
        </div>
    );
};

export default Login;