import { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);
    const verifyAbortControllerRef = useRef(null);
    const verifyTimeoutRef = useRef(null);

    useEffect(() => {
        // Check for stored token and user on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            // Verify token is still valid (with debounce to prevent rapid calls)
            debouncedVerifyToken(storedToken);
        } else {
            setLoading(false);
        }

        return () => {
            // Cleanup on unmount
            if (verifyAbortControllerRef.current) {
                verifyAbortControllerRef.current.abort();
            }
            if (verifyTimeoutRef.current) {
                clearTimeout(verifyTimeoutRef.current);
            }
        };
    }, []);

    const debouncedVerifyToken = (tokenToVerify) => {
        // Clear any pending verification
        if (verifyTimeoutRef.current) {
            clearTimeout(verifyTimeoutRef.current);
        }
        if (verifyAbortControllerRef.current) {
            verifyAbortControllerRef.current.abort();
        }

        // Debounce verification by 500ms to prevent rapid calls
        verifyTimeoutRef.current = setTimeout(() => {
            verifyToken(tokenToVerify);
        }, 500);
    };

    const verifyToken = async (tokenToVerify) => {
        // Abort any previous verification
        if (verifyAbortControllerRef.current) {
            verifyAbortControllerRef.current.abort();
        }

        // Create new abort controller for this verification
        verifyAbortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenToVerify}`,
                    'Content-Type': 'application/json'
                },
                signal: verifyAbortControllerRef.current.signal
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setToken(tokenToVerify);
            } else {
                // Only logout if token is actually invalid (not just network error)
                if (response.status === 401) {
                    logout();
                }
            }
        } catch (error) {
            // Don't logout on abort (cancelled request) or network errors
            if (error.name !== 'AbortError') {
                console.error('Token verification failed:', error);
                // Only logout on actual auth errors, not network issues
                if (error.message && !error.message.includes('fetch')) {
                    // Token might be invalid, but don't logout on network errors
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const login = (userData, tokenData) => {
        setUser(userData);
        setToken(tokenData);
        localStorage.setItem('token', tokenData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const getAuthHeaders = () => {
        if (!token) return {};
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const value = {
        user,
        token,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        getAuthHeaders
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};