import React from 'react';
import { Wand2, Cog, Award, FileUp, FileSignature as ManualIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CreationCard = ({ title, description, subtext, onClick, disabled = false, icon: Icon, loading = false }) => {
  const cardClasses = `bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-start text-left h-full transition-all duration-200 ${
    disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 hover:shadow-md'
  }`;

  return (
    <button onClick={() => !(disabled || loading) && onClick()} disabled={disabled || loading} className={cardClasses}>
        <div className="flex items-center w-full mb-3">{loading ? <Loader2 className="w-8 h-8 text-gray-600 animate-spin" /> : <Icon className="w-8 h-8 text-gray-600" />}</div>
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-500 flex-grow">{description}</p>
        {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
    </button>
  );
};

const CreateReportPage = () => {
  const handleCardClick = (path: string) => {
    toast.info('Раздел в разработке', {
      description: `Переход на ${path} будет добавлен в следующих версиях.`,
    });
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">ВЫБЕРИТЕ СПОСОБ СОЗДАНИЯ ОТЧЁТА</h1>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <CreationCard title="Manual Creation" description="Полный контроль над созданием отчета, от структуры до данных." subtext="(Ручной редактор)" onClick={() => handleCardClick('/reports/create/manual')} icon={ManualIcon} />
        <CreationCard title="Import from Excel" description="Загрузка готовой структуры из файла Excel." icon={FileUp} onClick={() => handleCardClick('/reports/create/import')} />
        <CreationCard title="AI Express" description="Быстрая генерация по одной фразе." onClick={() => handleCardClick('/reports/create/ai')} icon={Wand2} />
        <CreationCard title="Expert Engine" description="Профессиональное проектирование." subtext="(В разработке)" disabled={true} icon={Cog} onClick={()=>{}}/>
        <CreationCard title="Standards" description="Готовые эталоны (NPS, 8D, SWOT)." subtext="(В разработке)" disabled={true} icon={Award} onClick={()=>{}}/>
      </div>
    </>
  );
};

export default CreateReportPage;
