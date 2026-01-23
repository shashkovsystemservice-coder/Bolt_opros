
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const SelfDiagnosisDashboard = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('survey_templates')
          .select('id, title, created_at, is_active')
          .eq('company_id', user.id)
          .eq('survey_basis', 'self_diagnosis');
        
        if (error) throw error;
        setSurveys(data || []);
      } catch (error) {
        toast.error('Ошибка при загрузке списка самодиагностик.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Самодиагностика</h1>
        <Link to="/self-diagnosis/create">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Новая диагностика
          </button>
        </Link>
      </header>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата создания</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {surveys.map((survey) => (
                <tr key={survey.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{survey.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(survey.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{survey.is_active ? 'Активен' : 'Неактивен'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/surveys/${survey.id}/edit`} className="text-indigo-600 hover:text-indigo-900">Редактировать</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SelfDiagnosisDashboard;
