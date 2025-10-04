import React, { useState } from 'react';
import { useAdminAuth } from './context/AdminAuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import './admin.css';

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

    return (
        // Outer container for full-page centering
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f4f4f4',
            padding: '20px' // Added to prevent edge-to-edge on small screens
        }}>
            {/* Login card with consistent padding and sizing */}
            <div className="admin-container" style={{
                width: '100%',
                maxWidth: '400px', // Slightly wider for better form appearance
                maxHeight: '600px', // Slightly wider for better form appearance
                padding: '32px', // Consistent padding on all sides
                borderRadius: '8px',
                backgroundColor: 'transparent',
                boxSizing: 'border-box'
            }}>
                <h1 className="admin-title" style={{
                    textAlign: 'center',
                    marginBottom: '16px',
                    fontSize: '24px',
                    fontWeight: '600'
                }}>
                    Admin Login
                </h1>

                <p style={{
                    marginBottom: '24px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px'
                }}>
                    Log in with your Django Superuser credentials:
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Username Input */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username (e.g., admin)"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '16px',
                                boxSizing: 'border-box'
                            }}
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '16px',
                                boxSizing: 'border-box'
                            }}
                            required
                        />
                    </div>

                    {error && (
                        <div className="alert-danger" style={{
                            marginBottom: '20px',
                            color: '#d32f2f',
                            textAlign: 'center',
                            fontSize: '14px'
                        }}>
                            Invalid Username or Password.
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            width: '100%', // Full width for consistency
                            padding: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            backgroundColor: '#007bff',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;