import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Settings, Copy, Trash2, Lock, AlertCircle, CheckCircle, Loader2, X, ShieldCheck, Building, Mail } from 'lucide-react';

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

          return {
            ...company,
            survey_count: surveyCount || 0,
            response_count: 0, // Placeholder
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
    setTimeout(() => setToast(null), 4000);
  };

  const handleBlockCompany = async (companyId: string, isBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_blocked: !isBlocked })
        .eq('id', companyId);
      if (error) throw error;

      setCompanies(companies.map((c) => (c.id === companyId ? { ...c, is_blocked: !isBlocked } : c)));
      showToast('success', `Компания ${isBlocked ? 'разблокирована' : 'заблокирована'}`);
      setShowModal(false);
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

      setCompanies(companies.map((c) => (c.id === selectedCompany.id ? { ...c, subscription_plan: newPlan } : c)));
      setShowModal(false);
      showToast('success', 'Тарифный план компании обновлен');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту компанию? Это действие необратимо и приведет к удалению всех связанных данных (опросов, ответов, контактов).')) return;

    try {
      const { error } = await supabase.rpc('delete_company_by_id', { company_id_to_delete: companyId });
      if (error) throw error;

      setCompanies(companies.filter((c) => c.id !== companyId));
      setShowModal(false);
      showToast('success', 'Компания и все ее данные были удалены');
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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Управление компаниями</h1>
          <p className="text-text-secondary mt-2">
            Найдено компаний: {filteredCompanies.length}
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Поиск по названию или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-surface border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-20 rounded-xl bg-surface border border-border-subtle">
            <p className="text-text-secondary">Компании не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div 
                key={company.id} 
                className="bg-surface rounded-2xl border border-border-subtle shadow-ambient p-6 flex flex-col justify-between transition-shadow hover:shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-semibold text-lg text-text-primary flex items-center gap-2">
                       <Building className="w-5 h-5 text-text-secondary"/>
                       {company.name}
                    </div>
                    {company.is_blocked ? (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Заблокирована
                      </span>
                    ) : (
                       <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Активна
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-text-secondary space-y-3 mb-6">
                      <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4"/>
                           {company.email}
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">Тариф:</span>
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                            {company.subscription_plan}
                         </span>
                      </div>
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-4 flex items-center justify-between">
                   <p className="text-xs text-text-secondary">
                      Зарегистрирован: {new Date(company.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  <button
                    onClick={() => {
                      setSelectedCompany(company);
                      setNewPlan(company.subscription_plan);
                      setShowModal(true);
                    }}
                    className="p-2 hover:bg-background rounded-full transition-colors text-text-secondary hover:text-primary"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && selectedCompany && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl shadow-ambient w-full max-w-lg border border-border-subtle">
              <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                <h3 className="text-lg font-semibold text-text-primary">{selectedCompany.name}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-background">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                 <div>
                    <label className="text-sm font-medium text-text-primary mb-2 block">Сменить тарифный план</label>
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                      className="w-full h-11 px-4 bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                   <button
                      onClick={handleChangePlan}
                      className="w-full h-11 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-semibold"
                    >
                      Сохранить изменения
                    </button>
              </div>

              <div className="p-6 border-t border-border-subtle bg-background/70 rounded-b-2xl">
                  <h4 className="font-semibold text-text-primary mb-3">Опасная зона</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleBlockCompany(selectedCompany.id, selectedCompany.is_blocked)}
                      className={`w-full text-center px-4 py-2 rounded-lg transition-colors border ${selectedCompany.is_blocked ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                    >
                      {selectedCompany.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                     <button 
                      onClick={() => handleDeleteCompany(selectedCompany.id)}
                      className="w-full text-center px-4 py-2 rounded-lg transition-colors border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Удалить компанию
                    </button>
                  </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div 
            className={`fixed bottom-5 right-5 p-4 rounded-xl shadow-ambient border flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
             {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </div>
        )}
      </div>
  );
}
