import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { Search, Settings, Copy, Trash2, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  email: string;
  created_at: string;
  subscription_plan: string;
  is_blocked: boolean;
  survey_count?: number;
  response_count?: number;
}

export function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newPlan, setNewPlan] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const companiesWithStats = await Promise.all(
        (data || []).map(async (company) => {
          const { count: surveyCount } = await supabase
            .from('survey_templates')
            .select('*', { count: 'exact' })
            .eq('company_id', company.id);

          const { count: responseCount } = await supabase
            .from('survey_submissions')
            .select('*', { count: 'exact' })
            .eq('survey_template_id', supabase.from('survey_templates').select('id').eq('company_id', company.id));

          return {
            ...company,
            survey_count: surveyCount || 0,
            response_count: 0,
          };
        })
      );

      setCompanies(companiesWithStats);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const generateTempPassword = () => {
    const pass = Math.random().toString(36).slice(-8);
    setTempPassword(pass);
  };

  const handleBlockCompany = async (companyId: string, isBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_blocked: !isBlocked })
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(
        companies.map((c) =>
          c.id === companyId ? { ...c, is_blocked: !isBlocked } : c
        )
      );
      showToast('success', 'Статус обновлен');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedCompany || !newPlan) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ subscription_plan: newPlan })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      setCompanies(
        companies.map((c) =>
          c.id === selectedCompany.id
            ? { ...c, subscription_plan: newPlan }
            : c
        )
      );
      setShowModal(false);
      showToast('success', 'План обновлен');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Это удалит ВСЕ данные компании. Вы уверены?')) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(companies.filter((c) => c.id !== companyId));
      setShowModal(false);
      showToast('success', 'Компания удалена');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#1F1F1F] mb-2">
            Управление компаниями ({companies.length})
          </h2>
          <p className="text-[#5F6368]">Управление всеми компаниями и их подписками</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5F6368]" strokeWidth={2} />
            <input
              type="text"
              placeholder="Поиск по названию или email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border border-[#1A73E8] border-t-transparent mx-auto mb-4"></div>
              <p className="text-[#5F6368]">Загрузка...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#5F6368]">Компании не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8EAED]">
                    <th className="text-left py-3 px-4 font-semibold text-[#1F1F1F]">Компания</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#1F1F1F]">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#1F1F1F]">План</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#1F1F1F]">Статус</th>
                    <th className="text-left py-3 px-4 font-semibold text-[#1F1F1F]"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="border-b border-[#E8EAED] hover:bg-[#F8F9FA]">
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#1F1F1F]">{company.name}</p>
                        <p className="text-sm text-[#5F6368]">
                          {new Date(company.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[#5F6368]">{company.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-[#E8F0FE] text-[#1A73E8] rounded-full text-sm font-medium">
                          {company.subscription_plan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {company.is_blocked ? (
                          <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                            <Lock className="w-4 h-4" /> Заблокирована
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
                            Активна
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setNewPlan(company.subscription_plan);
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-[#E8EAED] rounded-lg transition-colors"
                        >
                          <Settings className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Management Modal */}
      {showModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[#1F1F1F] mb-4">
              Управление компанией
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-[#5F6368] mb-1">Название</p>
                <p className="font-medium text-[#1F1F1F]">{selectedCompany.name}</p>
              </div>
              <div>
                <p className="text-sm text-[#5F6368] mb-1">Email</p>
                <p className="font-medium text-[#1F1F1F]">{selectedCompany.email}</p>
              </div>
              <div>
                <p className="text-sm text-[#5F6368] mb-1">Дата регистрации</p>
                <p className="font-medium text-[#1F1F1F]">
                  {new Date(selectedCompany.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#5F6368] mb-1">Опросов создано</p>
                <p className="font-medium text-[#1F1F1F]">{selectedCompany.survey_count || 0}</p>
              </div>
              <div>
                <label className="block text-sm text-[#5F6368] mb-2">План подписки</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full h-10 px-3 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8]"
                >
                  <option value="Free">Free</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={generateTempPassword}
                className="w-full h-10 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] transition-colors"
              >
                Сбросить пароль
              </button>
              <button
                onClick={handleChangePlan}
                className="w-full h-10 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Изменить план
              </button>
              <button
                onClick={() => handleBlockCompany(selectedCompany.id, selectedCompany.is_blocked)}
                className={`w-full h-10 rounded-lg font-medium transition-colors ${
                  selectedCompany.is_blocked
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {selectedCompany.is_blocked ? 'Разблокировать' : 'Заблокировать'}
              </button>
              <button
                onClick={() => handleDeleteCompany(selectedCompany.id)}
                className="w-full h-10 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Удалить компанию
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full h-10 border border-[#E8EAED] rounded-lg font-medium text-[#1F1F1F] hover:bg-[#F8F9FA] transition-colors mt-4"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && tempPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" strokeWidth={2} />
            <h3 className="text-lg font-semibold text-[#1F1F1F] mb-4">Временный пароль</h3>
            <p className="text-sm text-[#5F6368] mb-4">
              Скопируйте и отправьте пользователю:
            </p>
            <div className="bg-[#F8F9FA] p-4 rounded-lg mb-4 flex items-center gap-2">
              <code className="flex-1 font-mono font-bold text-[#1A73E8] text-lg">
                {tempPassword}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  showToast('success', 'Скопировано');
                }}
                className="p-2 hover:bg-white rounded transition-colors"
              >
                <Copy className="w-5 h-5 text-[#1A73E8]" strokeWidth={2} />
              </button>
            </div>
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setTempPassword('');
              }}
              className="w-full h-10 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] transition-colors"
            >
              Готово
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${
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
    </AdminLayout>
  );
}
