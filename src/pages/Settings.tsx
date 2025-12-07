import { DashboardLayout } from '../components/DashboardLayout';
import { Settings as SettingsIcon } from 'lucide-react';

export function Settings() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-[#1F1F1F] tracking-tight mb-2">Настройки</h1>
          <p className="text-[#5F6368]">Управление настройками аккаунта</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EAED] p-12 text-center">
          <div className="w-16 h-16 bg-[#E8F0FE] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SettingsIcon className="w-8 h-8 text-[#1A73E8]" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-medium text-[#1F1F1F] mb-2">В разработке</h2>
          <p className="text-[#5F6368]">Настройки скоро появятся здесь</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
