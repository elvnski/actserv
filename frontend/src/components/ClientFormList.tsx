import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './client.css';
import AdminAppLayout from './admin/AdminAppLayout.tsx';


const CLIENT_API_URL = 'http://127.0.0.1:8000/api/client/forms/';


interface FormSummary {
    name: string;
    slug: string;
    description: string;
}

const ClientFormList = () => {
    const [forms, setForms] = useState<FormSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Persistence (Local Storage) Check ---
    const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);

    useEffect(() => {
        // Load completion status from local storage immediately
        try {
            const stored = localStorage.getItem('completedForms');
            if (stored) {
                setCompletedSlugs(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load completed forms from storage", e);
        }

        // Fetch the list of available forms
        setLoading(true);
        axios.get<FormSummary[]>(CLIENT_API_URL)
            .then(response => {
                setForms(response.data);
            })
            .catch(err => {
                console.error("Failed to fetch client forms:", err.response?.data || err);
                setError("Failed to load available forms. Please ensure the public API is running.");
            })
            .finally(() => setLoading(false));
    }, []);


    const navLinks = {
        toForms: { to: '/client/forms', text: 'Go to Onboarding Forms' },
        toLanding: { to: '/onboarding.html', text: 'Go to Landing Page', href: true},
    };


    if (loading) return (

        <AdminAppLayout
            pageTitle="Available Onboarding Forms"
            pageSubtitle="Select a form below to begin your onboarding submissions."
            navLink1={navLinks.toForms}
            navLink2={navLinks.toLanding}
        >

            <div className="client-container">
                <h1 className="client-title">Available Forms</h1>
                <p style={{ color: 'black' }}>Loading Forms...</p>
            </div>
        </AdminAppLayout>
    );

    if (error) return (

        <AdminAppLayout
            pageTitle="Available Onboarding Forms"
            pageSubtitle="Select a form below to begin your onboarding submissions."
            navLink1={navLinks.toForms}
            navLink2={navLinks.toLanding}
        >

            <div className="client-container">
                <h1 className="client-title">Available Forms</h1>
                <p className="alert-danger">Error: {error}</p>
            </div>
        </AdminAppLayout>
    );

    return (

        <AdminAppLayout
            pageTitle="Available Onboarding Forms"
            pageSubtitle="Select a form below to begin your onboarding submissions."
            navLink1={navLinks.toForms}
            navLink2={navLinks.toLanding}
        >

            <div className="client-container client-form-list">
                {/*<h1 className="client-title">Available Onboarding Forms</h1>*/}
                {/*<p className="client-subtitle">Select a form below to begin your submission.</p>*/}

                {forms.length === 0 ? (
                    <div className="no-forms">
                        <p>No active forms are currently available. Please check back later.</p>
                    </div>
                ) : (
                    <ul className="form-list">
                        {forms.map(form => {
                            const isCompleted = completedSlugs.includes(form.slug);

                            return (
                                <li key={form.slug} className={`form-list-item ${isCompleted ? 'completed' : ''}`}>
                                    <div className="form-details">
                                        <h3 className="form-name">{form.name}</h3>
                                        <p className="form-description">{form.description}</p>
                                    </div>
                                    <div className="form-action">
                                        {isCompleted ? (
                                            <span className="status-completed">Completed ✅</span>
                                        ) : (
                                            <Link
                                                to={`/form/${form.slug}`}
                                                className="btn-primary"
                                            >
                                                Start Form →
                                            </Link>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </AdminAppLayout>

    );
};

export default ClientFormList;