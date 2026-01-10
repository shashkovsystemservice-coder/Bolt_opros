
import { DashboardLayout } from '../components/DashboardLayout';
import { BarChart2 } from 'lucide-react';

const AnalysisPage = () => {
  return (
    <DashboardLayout>
      <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
        <div className="mx-auto mb-4 bg-gray-100 w-12 h-12 flex items-center justify-center rounded-full">
            <BarChart2 size={24} className="text-gray-500"/>
        </div>
        <h3 className="text-md font-semibold text-gray-800 mb-1">Аналитика (скоро)</h3>
        <p className="text-gray-500 mb-5 text-sm">Здесь будут появляться аналитические отчеты после обработки данных. Этот функционал находится в разработке.</p>
    </div>
    </DashboardLayout>
  );
};

export default AnalysisPage;
