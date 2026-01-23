
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

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
}

const StandardsCatalogModal: React.FC<StandardsCatalogModalProps> = ({ isOpen, onClose, onSelectStandard }) => {
  const [standards, setStandards] = useState<StandardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStrictMode, setIsStrictMode] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchStandards();
      setIsStrictMode(true); // Reset on open
    }
  }, [isOpen]);

  const fetchStandards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('standard_templates')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching standards:', error);
    } else {
      setStandards(data as StandardTemplate[]);
    }
    setLoading(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Галерея методик</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        <div className="flex items-center space-x-2 mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Switch
            id="strict-mode-toggle"
            checked={isStrictMode}
            onCheckedChange={setIsStrictMode}
          />
          <Label htmlFor="strict-mode-toggle" className="font-medium text-blue-800">
            Строгое соответствие методологии (заблокировать вопросы)
          </Label>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><p>Загрузка...</p></div>
        ) : standards.length === 0 ? (
          <div className="flex justify-center items-center h-64"><p className="text-gray-500">Методики не найдены</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standards.map((standard) => (
              <div key={standard.id} className="border rounded-lg p-4 flex flex-col">
                <h3 className="font-bold text-lg mb-2">{standard.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{standard.category}</p>
                <p className="text-sm flex-grow">{standard.description}</p>
                <Button onClick={() => onSelectStandard(standard, isStrictMode)} className="mt-4 w-full">
                  Применить методику
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StandardsCatalogModal;
