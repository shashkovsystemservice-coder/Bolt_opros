import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle, Building2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CompanyData {
  id: string;
  name: string;
}

export function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminError, setSuperAdminError] = useState('');

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompany(data);
        setCompanyName(data.name);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company || !companyName.trim()) {
      showToast('error', 'Название компании не может быть пустым');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('companies')
        .update({ name: companyName.trim() })
        .eq('id', company.id);

      if (error) throw error;

      setCompany({ ...company, name: companyName.trim() });
      showToast('success', 'Данные компании обновлены');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleSuperAdminLogin = () => {
    if (superAdminPassword === '1392') {
      sessionStorage.setItem('admin_authenticated', 'true');
      navigate('/admin/companies');
    } else {
      setSuperAdminError('Неверный пароль');
      setTimeout(() => setSuperAdminError(''), 3000);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border border-[#1A73E8] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5F6368]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">Настройки</h1>
          <p className="text-[#5F6368]">Управление настройками компании</p>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-[#E8EAED] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#E8F0FE] rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#1A73E8]" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-[#1F1F1F]">Профиль компании</h2>
                <p className="text-sm text-[#5F6368]">Основная информация о вашей компании</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-[#1F1F1F] mb-2">
                  Название компании
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Введите название компании"
                  required
                  className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-[#E8EAED] flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !companyName.trim() || companyName === company?.name}
                  className="flex items-center gap-2 px-6 h-11 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" strokeWidth={2} />
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>

                {companyName !== company?.name && companyName.trim() && (
                  <button
                    type="button"
                    onClick={() => setCompanyName(company?.name || '')}
                    className="px-6 h-11 border border-[#E8EAED] text-[#5F6368] rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Отменить
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8EAED] p-8">
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-red-600" strokeWidth={2} />
                  </div>
                  <div>
                      <h2 className="text-xl font-medium text-[#1F1F1F]">Режим Суперадминистратора</h2>
                      <p className="text-sm text-[#5F6368]">Доступ к глобальным настройкам системы</p>
                  </div>
              </div>

              <div className="space-y-4">
                  <div>
                      <label htmlFor="superAdminPassword" className="block text-sm font-medium text-[#1F1F1F] mb-2">
                          Пароль доступа
                      </label>
                      <input
                          id="superAdminPassword"
                          type="password"
                          value={superAdminPassword}
                          onChange={(e) => setSuperAdminPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSuperAdminLogin()}
                          placeholder="Введите пароль"
                          className="w-full max-w-xs h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-red-500 transition-colors"
                      />
                  </div>
                  {superAdminError && <p className="text-sm text-red-600">{superAdminError}</p>}
                  <div className="pt-2 flex gap-3">
                      <button
                          onClick={handleSuperAdminLogin}
                          className="flex items-center gap-2 px-6 h-11 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                          Войти
                      </button>
                  </div>
              </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" strokeWidth={2} />
            ) : (
              <AlertCircle className="w-5 h-5" strokeWidth={2} />
            )}
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
