
import { DashboardLayout } from '../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Wand2, FileUp, Database } from 'lucide-react';

const CreationCard = ({ title, description, level, path, disabled = false, icon: Icon }) => {
  const navigate = useNavigate();
  const cardClasses = `bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-start text-left h-full transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 hover:shadow-md'}`;
  const levelClasses = {
    Basic: 'bg-green-100 text-green-800',
    Advanced: 'bg-blue-100 text-blue-800',
    Expert: 'bg-purple-100 text-purple-800',
  };

  return (
    <button onClick={() => !disabled && navigate(path)} disabled={disabled} className={cardClasses}>
        <div className="flex items-center justify-between w-full mb-3">
          <Icon className="w-7 h-7 text-gray-500" />
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${levelClasses[level]}`}>{level}</span>
        </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 flex-grow">{description}</p>
    </button>
  );
};

const CreateInstrumentPage = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <header className="mb-8">
        <button onClick={() => navigate('/instruments')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
          <ArrowLeft size={16} /> Назад ко всем инструментам
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Создание нового инструмента</h1>
        <p className="text-gray-500 mt-1">Выберите способ создания вашего инструмента для сбора данных.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <CreationCard 
          title="Создать с нуля"
          description="Ручное добавление и настройка вопросов. Полный контроль над структурой."
          level="Basic"
          path="/instruments/create/manual"
          icon={Plus}
        />
        <CreationCard 
          title="AI-генератор"
          description="Укажите тему, и AI предложит готовый список вопросов. Идеально для быстрого старта."
          level="Basic"
          path="/create-survey-wizard" // Существующий флоу
          icon={Wand2}
        />
        <CreationCard 
          title="Конструктор Blueprint"
          description="Проектирование сложных диагностических инструментов с осями и параметрами."
          level="Expert"
          path="/instruments/create/blueprint" // Будущий флоу
          icon={Database}
        />
        <CreationCard 
          title="Импорт из файла"
          description="Загрузите структуру из файла Excel или CSV. Функция появится в ближайшее время."
          level="Advanced"
          path="/import"
          disabled={true}
          icon={FileUp}
        />
      </div>
    </DashboardLayout>
  );
};

export default CreateInstrumentPage;
