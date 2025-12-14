import { AdminLayout } from '../components/AdminLayout';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { ru } from 'date-fns/locale';

interface LogEntry {
  id: string;
  created_at: string;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export function AdminMonitoring() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [dateRange, setDateRange] = useState<any>([
    {
      startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchLogs = async () => {
    if (!isClient) return;
    setLoading(true);
    setError(null);

    // --- FIX: Point to the correct analytics table ---
    const { data, error } = await supabase
      .from('ai_usage_analytics') // <-- Correct table name
      .select('*')
      .order('created_at', { ascending: false })
      .gte('created_at', dateRange[0].startDate.toISOString())
      .lte('created_at', dateRange[0].endDate.toISOString());

    if (error) {
      setError(error.message);
      setLogs([]);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    fetchLogs();
  }, [dateRange, isClient]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#1F1F1F]">Мониторинг использования ИИ</h2>
        <p className="text-[#5F6368]">Анализируйте расход токенов по моделям и периодам.</p>
      </div>

      {isClient && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <h3 className="font-semibold text-lg mb-3">Фильтр по дате</h3>
          <DateRange
            editableDateInputs={true}
            onChange={item => setDateRange([item.selection])}
            moveRangeOnFirstSelection={false}
            ranges={dateRange}
            locale={ru}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-[#E8EAED]">
          <thead className="bg-[#F8F9FA]">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5F6368] uppercase tracking-wider">Дата и время</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5F6368] uppercase tracking-wider">Модель</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5F6368] uppercase tracking-wider">Входные токены</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5F6368] uppercase tracking-wider">Выходные токены</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#5F6368] uppercase tracking-wider">Всего токенов</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#E8EAED]">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4">Загрузка...</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="text-center py-4 text-red-500">Ошибка: {error}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4">Нет данных за выбранный период.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F1F1F]">{new Date(log.created_at).toLocaleString('ru-RU')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F1F1F]">{log.model_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F1F1F]">{log.input_tokens}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F1F1F]">{log.output_tokens}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F1F1F] font-bold">{log.total_tokens}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}