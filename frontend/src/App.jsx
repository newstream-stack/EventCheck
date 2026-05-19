import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Events from './pages/Events';
import Participants from './pages/Participants';
import Scanner from './pages/Scanner';
import AdminUsers from './pages/AdminUsers';
import Settings from './pages/Settings';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/events" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
          <Route path="/events/:eid" element={<PrivateRoute><Participants /></PrivateRoute>} />
          <Route path="/events/:eid/checkin" element={<PrivateRoute><Scanner /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute adminOnly><AdminUsers /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
