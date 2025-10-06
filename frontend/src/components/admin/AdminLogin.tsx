import React, { useState } from 'react';
import { useAdminAuth } from './context/AdminAuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import './admin.css'; // Your existing CSS file

const AdminLogin: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const { login } = useAdminAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(false);

        const success = await login(username, password);

        if (success) {
            navigate('/admin/submissions');
        } else {
            setError(true);
        }
    };

    // Standard CSS for the gradient background
    const heroBackgroundStyle = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        // Linear Gradient matching: #1f2937 (Slate 800) to #064e3b (Emerald 900)
        background: 'linear-gradient(135deg, #1f2937 0%, #064e3b 100%)',
    };

    // Standard CSS for the login card
    const cardStyle = {
        width: '100%',
        maxWidth: '400px',
        padding: '32px', // p-8 equivalent
        backgroundColor: 'white',
        borderRadius: '12px', // rounded-xl equivalent
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // shadow-2xl equivalent
        border: '1px solid #f3f4f6', // border-gray-100 equivalent
    };

    // Standard CSS for the Emerald Button
    const buttonStyle = {
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '12px',
        fontSize: '16px',
        fontWeight: '600',
        borderRadius: '9999px', // rounded-full equivalent
        color: 'white',
        backgroundColor: '#059669', // Emerald-600 color code
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
    };

    // Utility function for button hover (since inline styles don't handle pseudo-classes easily)
    const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = '#047857'; // Darker emerald-700
    };
    const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = '#059669'; // Back to Emerald-600
    };


    return (
        <div style={heroBackgroundStyle}>

            <div style={cardStyle}>

                {/* Header Title */}
                <h1 style={{ fontSize: '2rem', fontWeight: '800', textAlign: 'center', marginBottom: '1.5rem', color: '#1f2937' }}>
                    Admin Login
                </h1>
                <p style={{ color: '#4b5563', textAlign: 'center', marginBottom: '1.5rem' }}>
                    Use superuser credentials to access form configuration and submissions.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Username Field */}
                    <div>
                        <label
                            htmlFor="username"
                            style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            placeholder="e.g., admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                transition: 'border-color 0.15s'
                            }}
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label
                            htmlFor="password"
                            style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                transition: 'border-color 0.15s'
                            }}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            backgroundColor: '#fee2e2', // Red-100
                            border: '1px solid #f87171', // Red-400
                            color: '#b91c1c', // Red-700
                            padding: '12px 16px',
                            borderRadius: '6px',
                            textAlign: 'center',
                            fontSize: '0.875rem'
                        }}>
                            Invalid Username or Password.
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        style={buttonStyle}
                        onMouseOver={handleMouseOver}
                        onMouseOut={handleMouseOut}
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;