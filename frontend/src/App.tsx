import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ClientMenu from './pages/ClientMenu';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/menu/:slug" element={<ClientMenu />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
