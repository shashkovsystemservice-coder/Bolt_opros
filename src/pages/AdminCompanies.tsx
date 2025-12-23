
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Settings, Loader2, X, ShieldCheck, Building, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  email: string;
  created_at: string;
  subscription_plan: string;
  is_blocked: boolean;
}

// --- Styled Components ---
const ActionButton = ({ onClick, children, variant = 'primary', disabled = false, loading = false, className = '' }) => {
    const baseClasses = "inline-flex items-center justify-center font-medium text-sm rounded-md transition-colors duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background h-9 px-4";
    const variantClasses = {
        primary: "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary",
        secondary: "bg-surface border border-border hover:bg-background text-text-primary focus:ring-primary",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        warning: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500",
    };
    return <button onClick={onClick} disabled={disabled || loading} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{loading ? <Loader2 className="animate-spin h-5 w-5"/> : children}</button>
};

const ActionIcon = ({ onClick, children, title }) => (
    <button onClick={onClick} title={title} className="p-1.5 text-text-secondary hover:text-primary rounded-md hover:bg-primary/10 transition-colors">
        {children}
    </button>
);

// --- Page Components ---

const CompanyRow = ({ company, onSelect }) => (
  <div className="flex justify-between items-center group py-4 border-b border-border-subtle last:border-b-0">
    <div className="flex items-center gap-4 flex-grow pr-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${company.is_blocked ? 'bg-red-100' : 'bg-green-100'}`}>
          {company.is_blocked ? <Lock className="w-5 h-5 text-red-600"/> : <Building className="w-5 h-5 text-green-700"/>}
      </div>
      <div className="flex-grow">
        <h3 className="font-medium text-text-primary text-sm truncate">{company.name}</h3>
        <p className="text-sm text-text-secondary mt-0.5 truncate">{company.email}</p>
      </div>
    </div>

    <div className="hidden md:flex items-center gap-6 flex-shrink-0">
      <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-md">
        {company.subscription_plan}
      </span>
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${company.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${company.is_blocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
        {company.is_blocked ? 'Заблокирована' : 'Активна'}
      </span>
      <p className="text-sm text-text-secondary w-28 text-left">
        {new Date(company.created_at).toLocaleDateString('ru-RU')}
      </p>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 text-right">
        <ActionIcon onClick={() => onSelect(company)} title="Настройки">
          <Settings size={16} />
        </ActionIcon>
      </div>
    </div>
     <div className="md:hidden w-8 text-right flex-shrink-0">
        <ActionIcon onClick={() => onSelect(company)} title="Настройки">
          <Settings size={16} />
        </ActionIcon>
      </div>
  </div>
);

const ManagementModal = ({ company, onClose, onUpdate }) => {
  const [newPlan, setNewPlan] = useState(company.subscription_plan);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleUpdate = async (updateFn, successMsg) => {
    setIsUpdating(true);
    try {
        await updateFn();
        toast.success(successMsg);
        onUpdate();
    } catch (err) {
        toast.error(err.message)
    } finally {
        setIsUpdating(false);
    }
  };

  const handleChangePlan = () => handleUpdate(
    () => supabase.from('companies').update({ subscription_plan: newPlan }).eq('id', company.id).throwOnError(),
    'Тарифный план обновлен'
  );

  const handleBlockCompany = () => handleUpdate(
    () => supabase.from('companies').update({ is_blocked: !company.is_blocked }).eq('id', company.id).throwOnError(),
    `Компания ${company.is_blocked ? 'разблокирована' : 'заблокирована'}`
  );

  const handleDeleteCompany = () => {
    toast(`Вы уверены, что хотите удалить ${company.name}?`, {
      description: 'Это действие необратимо и приведет к удалению всех связанных данных.',
      action: {
        label: 'Удалить', 
        onClick: () => handleUpdate(
          () => supabase.rpc('delete_company_by_id', { company_id_to_delete: company.id }).throwOnError(),
          'Компания и все ее данные удалены'
        )
      },
      cancel: { label: 'Отмена' }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg border border-border-subtle" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-border-subtle flex justify-between items-center">
          <h3 className="text-lg font-semibold text-text-primary">{company.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-background"><X className="w-5 h-5 text-text-secondary" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">Тарифный план</label>
            <div className="flex gap-3">
                <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                </select>
                <ActionButton onClick={handleChangePlan} disabled={newPlan === company.subscription_plan} loading={isUpdating}>Сохранить</ActionButton>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border-subtle bg-background/50 rounded-b-lg">
          <h4 className="font-medium text-text-primary mb-4">Опасная зона</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <ActionButton onClick={handleBlockCompany} variant={company.is_blocked ? 'secondary' : 'warning'} loading={isUpdating} className="w-full justify-center">{company.is_blocked ? 'Разблокировать' : 'Заблокировать'}</ActionButton>
            <ActionButton onClick={handleDeleteCompany} variant="danger" loading={isUpdating} className="w-full justify-center">Удалить компанию</ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page --- 

export function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCompanies(data || []);
    } catch (err: any) {
      toast.error("Ошибка при загрузке компаний: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleModalUpdate = () => {
      setSelectedCompany(null);
      fetchCompanies();
  }

  const filteredCompanies = companies.filter(
    (c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Управление компаниями</h1>
          <p className="text-text-secondary mt-1 text-sm">Найдено компаний: {filteredCompanies.length}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Поиск по названию или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80"
          />
        </div>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin mx-auto"/></div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border-subtle rounded-lg">
             <p className="text-text-secondary font-medium">Компании не найдены</p>
          </div>
        ) : (
          <div className="border-t border-border-subtle">
            {filteredCompanies.map((company) => (
              <CompanyRow key={company.id} company={company} onSelect={setSelectedCompany} />
            ))}
          </div>
        )}

        {selectedCompany && <ManagementModal company={selectedCompany} onClose={() => setSelectedCompany(null)} onUpdate={handleModalUpdate} />}

      </div>
  );
}
