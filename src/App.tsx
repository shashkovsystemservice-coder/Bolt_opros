import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Auth } from './pages/Auth';
import { ResetPassword } from './pages/ResetPassword';
import { SurveyList } from './pages/Dashboard';
import CreateSurvey from './pages/CreateSurvey';
import CreateInstrumentPage from './pages/CreateInstrumentPage';
import EditSurvey from './pages/EditSurvey';
import Recipients from './pages/Recipients';
import ContactsPage from './pages/Contacts';
import { SurveyForm } from './pages/SurveyForm';
import { Responses } from './pages/Responses';
import { Settings } from './pages/Settings';
import { AdminCompanies } from './pages/AdminCompanies';
import { AdminStats } from './pages/AdminStats';
import { AdminSecurity } from './pages/AdminSecurity';
import { AdminSettings } from './pages/AdminSettings';
import AdminSurveyStructurePage from './pages/AdminSurveyStructure';
import SurveyGeneratorWizard from './pages/SurveyGeneratorWizard';
import { AdminLayout } from './components/AdminLayout';
import { DashboardLayout } from './components/DashboardLayout';
import { AllResponses } from './pages/AllResponses';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Публичные маршруты (БЕЗ МЕНЮ) */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/survey/:id" element={<SurveyForm />} />
          <Route path="/" element={<Navigate to="/instruments/create" replace />} />

          {/* Защищенные маршруты (ВНУТРИ МЕНЮ) */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/instruments/create" element={<CreateInstrumentPage />} />
            <Route path="/dashboard" element={<Outlet />} >
              <Route index element={<Navigate to="surveys" replace />} />
              <Route path="surveys" element={<SurveyList />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="responses" element={<AllResponses />} />
              <Route path="survey/:id/edit" element={<EditSurvey />} />
              <Route path="survey/:id/recipients" element={<Recipients />} />
              <Route path="survey/:id/responses" element={<Responses />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/survey/create" element={<CreateSurvey />} /> 
            <Route path="/survey-generator-wizard" element={<SurveyGeneratorWizard />} />
          </Route>
          
          {/* Маршруты для администратора */}
          <Route
            path="/admin"
            element={<AdminRoute><AdminLayout /></AdminRoute>}
          >
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="stats" element={<AdminStats />} />
            <Route path="structure" element={<AdminSurveyStructurePage />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Перенаправление для всех остальных случаев */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
