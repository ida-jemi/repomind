import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewAnalysis from "./pages/NewAnalysis.jsx";
import AnalysisView from "./pages/AnalysisView.jsx";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new" element={<NewAnalysis />} />
        <Route path="/analysis/:id" element={<AnalysisView />} />
      </Routes>
    </div>
  );
}
