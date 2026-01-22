
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { PublicSurveyPage } from './pages/PublicSurveyPage';
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
import RunsListPage from './pages/RunsListPage';
import RunDashboardPage from './pages/RunDashboardPage';
import ReportsListPage from './pages/ReportsListPage';
import CreateReportPage from './pages/CreateReportPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/survey/:id" element={<SurveyForm />} />
          <Route path="/r/:publicToken" element={<PublicSurveyPage />} />
          
          {/* Redirect from root to a default protected route */}
          <Route path="/" element={<Navigate to="/runs" replace />} />

          {/* PROTECTED ROUTES (wrapped in DashboardLayout) */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            
            {/* THIS WAS THE LOOP! Corrected to redirect to /runs which is the new main page */}
            <Route path="/dashboard" element={<Navigate to="/runs" replace />} />

            <Route path="/surveys" element={<SurveyList />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/responses" element={<AllResponses />} />
            <Route path="/reports" element={<ReportsListPage />} />
            <Route path="/reports/create" element={<CreateReportPage />} />

            {/* Run management routes */}
            <Route path="/runs" element={<RunsListPage />} />
            <Route path="/runs/:id" element={<RunDashboardPage />} />

            {/* Other survey-related routes */}
            <Route path="/survey/create" element={<CreateSurvey />} />
            <Route path="/survey/:id/edit" element={<EditSurvey />} />
            <Route path="/survey/:id/recipients" element={<Recipients />} />
            <Route path="/survey/:id/responses" element={<Responses />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Legacy/Wizard routes */}
            <Route path="/create-instrument" element={<CreateInstrumentPage />} />
            <Route path="/survey-generator-wizard" element={<SurveyGeneratorWizard />} />
          </Route>
          
          {/* ADMIN ROUTES */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="stats" element={<AdminStats />} />
            <Route path="structure" element={<AdminSurveyStructurePage />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Fallback redirect for any other unmatched route */}
          <Route path="*" element={<Navigate to="/runs" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
