// src/context/AdminAuthContext.tsx

import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { LOGIN_API_URL } from '../../../config/api.ts'; // <-- Import the login URL

interface AuthContextType {
    isAdmin: boolean;
    isAuthReady: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}
const AdminAuthContext = createContext<AuthContextType | undefined>(undefined);

// --- UTILITY FUNCTION ---
const setAxiosAuthHeader = (token: string | null) => {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [isAdmin, setIsAdmin] = useState(
        !!localStorage.getItem('adminToken')
    );
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Initialize Axios header on load if token exists in storage
    React.useEffect(() => {

        const initialToken = localStorage.getItem('adminToken');
        setAxiosAuthHeader(initialToken);
        setIsAdmin(!!initialToken);
        setIsAuthReady(true); // 🌟 Set READY after all initial setup is done
    }, []);


    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            // POST to the Django login endpoint
            const response = await axios.post(LOGIN_API_URL, { username, password });

            // Django responds with the token key (e.g., { token: "..." })
            const token = response.data.token;

            if (token) {
                localStorage.setItem('adminToken', token);
                setAxiosAuthHeader(token);
                setIsAdmin(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed:', error);
            // On failure, ensure the header is cleared
            setAxiosAuthHeader(null);
            setIsAdmin(false);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        setAxiosAuthHeader(null);
        setIsAdmin(false);
    };

    return (
        <AdminAuthContext.Provider value={{ isAdmin, isAuthReady, login, logout }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
};