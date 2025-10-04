import './App.css'
import DynamicForm from "./components/DynamicForm.tsx";
import {BrowserRouter as Router, Routes, Route, useParams, Navigate, Outlet} from 'react-router-dom';
import AdminFormBuilder from "./components/admin/AdminFormBuilder.tsx";
import FormList from "./components/admin/FormList.tsx";
import ClientFormList from "./components/ClientFormList.tsx";
import AdminSubmissionList from "./components/admin/AdminSubmissionList.tsx";
import AdminSubmissionDetail from "./components/admin/AdminSubmissionDetail.tsx";
import AdminLogin from "./components/admin/AdminLogin.tsx"; // <-- NEW
import { useAdminAuth } from './components/admin/context/AdminAuthContext.tsx'; // <-- NEW


// Wrapper to grab the slug from the url
const FormWrapper = () => {

    const {formSlug} = useParams<{formSlug: string}>();

    // Passing the slg to DynamicForm component
    return <DynamicForm formSlug = {formSlug || ''} />
};

// 🌟 NEW: Component to guard admin routes 🌟
const AdminAuthGuard: React.FC = () => {
    const { isAdmin } = useAdminAuth();
    // If user is not authenticated, redirect to the login page
    return isAdmin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};


function App() {

    return (

        <Router>
            <div className="App">

                <Routes>

                    {/* --- Client/Public Routes --- */}
                    <Route path="/" element={<div className="container mt-5"><h2>Welcome! Navigate to /form/[your-slug]</h2></div>} />
                    <Route path="/forms" element={<ClientFormList />} />
                    <Route path="/form/:formSlug" element={<FormWrapper />} />
                    <Route path="/client/forms" element={<ClientFormList />} />

                    {/* 🌟 NEW: Admin Login Route */}
                    <Route path="/admin/login" element={<AdminLogin />} />

                    {/* --- Admin Protected Routes --- */}
                    {/* All routes within this <Route element={...} /> block require authentication */}
                    <Route element={<AdminAuthGuard />}>

                        {/* Form List/Default Admin Page */}
                        <Route path="/admin/forms" element={<FormList />} />

                        {/* Route for Creating a New Form */}
                        <Route path="/admin/forms/new" element={<AdminFormBuilder />} />

                        {/* Route for Editing an Existing Form by ID */}
                        <Route path="/admin/forms/edit/:formId" element={<AdminFormBuilder />} />

                        {/* Admin Submission Routes */}
                        <Route path="/admin/submissions" element={<AdminSubmissionList />} />
                        <Route path="/admin/submissions/:submissionId" element={<AdminSubmissionDetail />} />

                    </Route>


                    {/* Redirect root to the admin list for easy access (if authenticated, guard will redirect to login if not) */}
                    <Route path="/admin" element={<Navigate to="/admin/submissions" replace />} />

                </Routes>
            </div>
        </Router>

    )
}

export default App