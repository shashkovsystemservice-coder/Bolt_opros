
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { X, Loader2 } from 'lucide-react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

// Восстановленный интерфейс БЕЗ ошибочного поля completion_settings
interface StandardTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  canonical_blueprint: any;
  is_active: boolean;
}

interface StandardsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStandard: (standard: StandardTemplate, isStrictMode: boolean) => void;
  filterCategory?: 'self_diagnosis' | 'other';
}

const StandardsCatalogModal: React.FC<StandardsCatalogModalProps> = ({ isOpen, onClose, onSelectStandard, filterCategory }) => {
  const [standards, setStandards] = useState<StandardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStrictMode, setIsStrictMode] = useState(true);

  const isForSelfDiagnosis = filterCategory === 'self_diagnosis';

  useEffect(() => {
    if (isOpen) {
      setIsStrictMode(true);
      fetchStandards();
    }
  }, [isOpen, filterCategory]);

  const fetchStandards = async () => {
    setLoading(true);
    // Исправленный запрос, который запрашивает только существующие поля
    let query = supabase
      .from('standard_templates')
      .select('id, name, category, description, canonical_blueprint, is_active')
      .eq('is_active', true);

    if (isForSelfDiagnosis) {
      query = query.eq('category', 'self_diagnosis');
    } else if (filterCategory === 'other') {
      query = query.not('category', 'eq', 'self_diagnosis');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching standards:', error);
      setStandards([]);
    } else {
      setStandards(data as StandardTemplate[]);
    }
    setLoading(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Галерея методик</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        <div className="flex items-center space-x-2 mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Switch
            id="strict-mode-toggle"
            checked={isForSelfDiagnosis || isStrictMode}
            onCheckedChange={setIsStrictMode}
            disabled={isForSelfDiagnosis}
          />
          <Label htmlFor="strict-mode-toggle" className={`font-medium flex-grow ${isForSelfDiagnosis ? 'text-gray-600' : 'text-blue-800'}`}>
            Строгое соответствие методологии (заблокировать вопросы)
            {isForSelfDiagnosis && <span className="text-xs block font-normal text-gray-500">Обязательно для самодиагностики</span>}
          </Label>
        </div>

        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full min-h-[200px]">
              <Loader2 className="w-8 h-8 text-gray-500 animate-spin"/>
              <p className="ml-2 text-gray-500">Загрузка...</p>
            </div>
          ) : standards.length === 0 ? (
            <div className="flex justify-center items-center h-full min-h-[200px]">
              <p className="text-gray-500 text-center">Методики для данной категории не найдены.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {standards.map((standard) => (
                <div key={standard.id} className="border rounded-lg p-4 flex flex-col bg-white">
                  <h3 className="font-bold text-lg mb-1">{standard.name}</h3>
                  <p className="text-xs text-gray-400 mb-2 uppercase font-medium">{standard.category}</p>
                  <p className="text-sm text-gray-600 flex-grow mb-4">{standard.description}</p>
                  <Button onClick={() => onSelectStandard(standard, isForSelfDiagnosis || isStrictMode)} className="mt-auto w-full">
                    Применить методику
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandardsCatalogModal;
