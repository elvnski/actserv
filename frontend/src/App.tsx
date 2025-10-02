import './App.css'
import DynamicForm from "./components/DynamicForm.tsx";
import {BrowserRouter as Router, Routes, Route, useParams, Navigate} from 'react-router-dom';
import AdminFormBuilder from "./components/admin/AdminFormBuilder.tsx";
import FormList from "./components/admin/FormList.tsx";


// Wrapper to grab the slug from the url
const FormWrapper = () => {

    const {formSlug} = useParams<{formSlug: string}>();

    // Passing the slg to DynamicForm component
    return <DynamicForm formSlug = {formSlug || ''} />
};


function App() {

  return (

     <Router>
         <div className="App">

             <Routes>

                 <Route path="/" element={<div className="container mt-5"><h2>Welcome! Navigate to /form/[your-slug]</h2></div>} />

                 <Route path="/form/:formSlug" element={<FormWrapper />} />

                 {/* --- Admin Routes --- */}

                 {/* 1. Form List/Default Admin Page */}
                 <Route path="/admin/forms" element={<FormList />} />

                 {/* 2. Route for Creating a New Form */}
                 <Route path="/admin/forms/new" element={<AdminFormBuilder />} />

                 {/* 3. Route for Editing an Existing Form by ID */}
                 <Route path="/admin/forms/edit/:formId" element={<AdminFormBuilder />} />

                 {/*Redirect root to the admin list for easy access */}
                 <Route path="/" element={<Navigate to="/admin/forms" replace />} />
             </Routes>
         </div>
     </Router>

  )
}

export default App
