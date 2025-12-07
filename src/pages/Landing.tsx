import { useNavigate } from 'react-router-dom';
import { ClipboardList, BarChart3, Users, Zap } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] via-white to-[#F8F9FA]">
      <header className="border-b border-[#E8EAED] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#1A73E8]" strokeWidth={2} />
            <span className="text-xl font-medium text-[#1F1F1F] tracking-tight">Survey Pro</span>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="px-5 py-2 text-sm font-medium text-[#1A73E8] hover:bg-[#F1F3F4] rounded-full transition-colors"
          >
            Войти
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-medium text-[#1F1F1F] mb-6 tracking-tight leading-tight">
            Создавайте опросы<br />за минуты
          </h1>
          <p className="text-xl text-[#5F6368] mb-10 max-w-2xl mx-auto leading-relaxed">
            Профессиональная платформа для создания опросов, сбора ответов и анализа данных
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="bg-[#1A73E8] text-white px-8 py-4 rounded-full font-medium hover:bg-[#1557B0] transition-all shadow-sm hover:shadow-md text-base h-14"
            >
              Начать бесплатно
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="bg-white border border-[#E8EAED] text-[#1F1F1F] px-8 py-4 rounded-full font-medium hover:bg-[#F8F9FA] transition-colors text-base h-14"
            >
              Войти
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-[#E8EAED] hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#E8F0FE] rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-[#1A73E8]" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-medium text-[#1F1F1F] mb-3">Быстрое создание</h3>
            <p className="text-[#5F6368] leading-relaxed">
              Создавайте профессиональные опросы за минуты с помощью интуитивного конструктора
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#E8EAED] hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#E8F0FE] rounded-xl flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-[#1A73E8]" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-medium text-[#1F1F1F] mb-3">Управление получателями</h3>
            <p className="text-[#5F6368] leading-relaxed">
              Отправляйте персональные ссылки через email, WhatsApp или вручную
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#E8EAED] hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#E8F0FE] rounded-xl flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-[#1A73E8]" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-medium text-[#1F1F1F] mb-3">Анализ результатов</h3>
            <p className="text-[#5F6368] leading-relaxed">
              Просматривайте ответы в реальном времени и экспортируйте данные в CSV
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
