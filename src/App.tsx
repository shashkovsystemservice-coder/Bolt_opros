
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { ResetPassword } from './pages/ResetPassword';

// Новые импорты страниц
import { InstrumentsPage, InstrumentList } from './pages/InstrumentsPage';
import CreateInstrumentPage from './pages/CreateInstrumentPage';
import ManualCreator from './pages/ManualCreator'; // Новый компонент для ручного создания
import DataPage from './pages/DataPage';
import AnalysisPage from './pages/AnalysisPage';

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
import { AllResponses } from './pages/AllResponses';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* --- Публичные маршруты --- */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/survey/:id" element={<SurveyForm />} />

          {/* --- Основные защищенные маршруты --- */}
          <Route path="/instruments" element={<ProtectedRoute><InstrumentsPage /></ProtectedRoute>}>
            <Route index element={<InstrumentList />} />
            <Route path=":id/edit" element={<EditSurvey />} />
            <Route path=":id/recipients" element={<Recipients />} />
            <Route path=":id/responses" element={<Responses />} />
          </Route>

          <Route path="/instruments/new" element={<ProtectedRoute><CreateInstrumentPage /></ProtectedRoute>} />
          <Route path="/instruments/create/manual" element={<ProtectedRoute><ManualCreator /></ProtectedRoute>} />
          <Route path="/create-survey-wizard" element={<ProtectedRoute><SurveyGeneratorWizard /></ProtectedRoute>} />

          <Route path="/data" element={<ProtectedRoute><DataPage /></ProtectedRoute>}>
            <Route index element={<Navigate to="responses" replace />} />
            <Route path="responses" element={<AllResponses />} />
            <Route path="contacts" element={<ContactsPage />} />
          </Route>

          <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* --- Маршруты для администратора --- */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="stats" element={<AdminStats />} />
            <Route path="structure" element={<AdminSurveyStructurePage />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* --- Редиректы и фолбэки --- */}
          <Route path="/dashboard" element={<Navigate to="/instruments" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
