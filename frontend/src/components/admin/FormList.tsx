import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './admin.css';
import { useAdminAuth } from './context/AdminAuthContext.tsx';
import type { AdminFormConfig } from '../../types.ts';
import { useParams, useNavigate } from 'react-router-dom';


const ADMIN_API_URL = 'http://127.0.0.1:8000/api/admin/forms/';

const FormList = () => {
    const [forms, setForms] = useState<AdminFormConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { logout, isAuthReady } = useAdminAuth();


    useEffect(() => {

        if (!isAuthReady) {
            // Keep loading state true while waiting for context
            return;
        }

        setLoading(true);
        axios.get<AdminFormConfig[]>(ADMIN_API_URL)
            .then(response => {
                setForms(response.data);
            })
            .catch(err => {
                console.error("Failed to fetch forms:", err);
                setError("Failed to load forms list. Ensure the backend API is accessible.");
            })
            .finally(() => setLoading(false));
    }, [isAuthReady]);

    const handleDelete = (formSlug: string) => {
        if (window.confirm("Are you sure you want to delete this form template? This action cannot be undone.")) {

            axios.delete(`${ADMIN_API_URL}${formSlug}/`)
                .then(() => {

                    setForms(prev => prev.filter(form => form.slug !== formSlug));
                    alert(`Form successfully deleted!`);
                })
                .catch(err => {

                    console.error("Failed to delete form:", err.response?.data || err);
                    alert("Failed to delete form. See console for error details.");
                });
        }
    };

    if (loading) return <div className="admin-container" style={{ color: 'black' }}>Loading Form Templates...</div>;
    if (error) return <div className="admin-container" style={{ color: 'red' }}>Error: {error}</div>;

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <div className="admin-container">

            <nav className="admin-nav">
                <Link to="/admin/submissions" className="btn-secondary btn-sm" style={{marginRight: '10px'}}>
                    Form Submissions
                </Link>
                <button onClick={handleLogout} className="btn-danger btn-sm">
                    Logout
                </button>
            </nav>


            <header className="admin-header">
                <h1 className="admin-title">Form Templates Administration</h1>
            </header>

            <Link
                to="/admin/forms/new"
                className="btn-primary"
            >
                + Create New Form
            </Link>

            {forms.length === 0 ? (
                <div className="admin-table-wrapper" style={{ padding: '20px', textAlign: 'center', marginBottom: '30px' }}>
                    <p style={{ color: '#666' }}>No form templates found. Click 'Create New Form' to begin.</p>
                </div>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Slug (Client URL)</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {forms.map((form) => (
                            <tr key={form.id}>
                                <td>
                                    <span style={{ color: "black"}}>
                                        {form.id}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ color: "black"}}>
                                        {form.name}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ color: "black"}}>
                                        {form.slug}
                                    </span>
                                </td>
                                <td>
                                        <span className={form.is_active ? 'status-active' : 'status-inactive'}>
                                            {form.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <Link
                                        to={`/admin/forms/edit/${form.slug}`}
                                        className="btn-secondary btn-sm"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => form.id && handleDelete(form.slug)}
                                        className="btn-danger btn-sm"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FormList;