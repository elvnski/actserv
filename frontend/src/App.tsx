import './App.css'
import DynamicForm from "./components/DynamicForm.tsx";
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';


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

                 <Route path="/form/:formSlug" element={<FormWrapper />} />

                 <Route path="/" element={<div className="container mt-5"><h2>Welcome! Navigate to /form/[your-slug]</h2></div>} />
             </Routes>
         </div>
     </Router>

  )
}

export default App
