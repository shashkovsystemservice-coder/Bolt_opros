
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Cpu, Users, BarChartBig, Check, Briefcase, UserCheck, MessageSquare, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

// --- UI Components for Enterprise Look --- //
const PrimaryButton = ({ children, className = '' }) => (
  <button className={`inline-flex items-center justify-center h-11 px-6 text-sm font-semibold text-white bg-primary rounded-md shadow-sm transition-transform duration-200 ease-in-out hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${className}`}>
    {children}
  </button>
);

const SecondaryButton = ({ children, className = '' }) => (
  <button className={`inline-flex items-center justify-center h-11 px-6 text-sm font-medium text-text-primary bg-background border border-border rounded-md shadow-sm transition-colors duration-200 ease-in-out hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${className}`}>
    {children}
  </button>
);

// --- Main Landing Page Component --- //
export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-text-primary font-sans antialiased">
      {/* --- Header --- */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">Survey Pro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hidden sm:block text-sm font-medium text-text-secondary hover:text-primary transition-colors">Посмотреть демо</Link>
            <Link to="/auth" className="hidden sm:block text-sm font-medium text-text-secondary hover:text-primary transition-colors">Войти</Link>
            <PrimaryButton onClick={() => navigate('/auth')}>Начать бесплатно</PrimaryButton>
          </div>
        </div>
      </header>

      <main>

        {/* --- 1. Hero Block --- */}
        <section className="relative pt-20 pb-10 md:pt-28 md:pb-16">
          <div className="container mx-auto px-4 text-center max-w-4xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight"
            >
              Платформа для исследований, которая находит в ответах готовые выводы
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary"
            >
              Survey Pro использует ИИ для систематизации качественных данных, выявления паттернов и формирования рекомендаций, чтобы вы могли принимать решения быстрее.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="mt-8 flex items-center justify-center gap-4"
            >
              <PrimaryButton onClick={() => navigate('/auth')}>Начать бесплатно <ArrowRight className="ml-2 h-4 w-4"/></PrimaryButton>
              <SecondaryButton>Посмотреть демо</SecondaryButton>
            </motion.div>
          </div>
        </section>

        {/* --- NEW BLOCK: Manifesto --- */}
        <section className="py-20 md:py-28 bg-surface">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-left">
                <h2 className="text-3xl font-bold tracking-tight text-center">Проблема не в данных, а в их интерпретации</h2>
                <div className="mt-8 space-y-6 text-md text-text-secondary">
                  <p>Мы годами работали в продуктовых командах и видели одну и ту же картину: сотни и тысячи открытых ответов лежат в таблицах мёртвым грузом. У команд никогда не хватает времени, чтобы вручную проанализировать этот объём качественных данных.</p>
                  <p>Существующие инструменты предлагают поверхностные решения вроде облаков тегов. Но такой подход часто вводит в заблуждение, упуская контекст и реальную боль пользователя. Неверная интерпретация опаснее, чем её отсутствие.</p>
                  <p>Поэтому мы создали Survey Pro. Мы верим, что ценность — не в сборе данных, а в качестве выводов. Мы спроектировали платформу, которая берёт на себя самую сложную часть работы, чтобы вы могли сфокусироваться на принятии верных решений.</p>
                </div>
            </div>
          </div>
        </section>

        {/* --- How Analysis Works --- */}
        <section className="py-20 md:py-28">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Как Survey Pro превращает ответы в выводы</h2>
                </div>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-surface rounded-lg border border-border text-primary font-bold text-lg">1</div>
                        <div>
                            <h3 className="font-semibold text-text-primary">Сбор количественных и открытых ответов</h3>
                            <p className="text-sm text-text-secondary mt-1">Вы запускаете опрос, а платформа собирает структурированные данные и текстовые ответы.</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-surface rounded-lg border border-border text-primary font-bold text-lg">2</div>
                        <div>
                            <h3 className="font-semibold text-text-primary">ИИ-анализ тем, настроений и сегментов</h3>
                            <p className="text-sm text-text-secondary mt-1">ИИ обрабатывает массив ответов, группируя их по темам, определяя тональность и находя скрытые поведенческие сегменты.</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-surface rounded-lg border border-border text-primary font-bold text-lg">3</div>
                        <div>
                            <h3 className="font-semibold text-text-primary">Формирование отчёта с инсайтами</h3>
                            <p className="text-sm text-text-secondary mt-1">Вы получаете интерактивный отчёт, где ключевые выводы и рекомендации уже сформулированы ИИ.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Example Insights --- */}
        <section className="py-20 md:py-24 bg-surface">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Примеры управленческих выводов</h2>
              <p className="mt-4 text-lg text-text-secondary">Это не облака тегов. Survey Pro предоставляет инсайты, на основе которых можно действовать.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[ 
                { title: 'Выявлен поведенческий паттерн', insight: 'Пользователи, которые пропускают шаг импорта контактов, на 40% реже конвертируются в платящих. Это указывает на критичность этого шага для восприятия ценности.' },
                { title: 'Найдена причина оттока', insight: 'В 65% ответов от ушедших клиентов упоминается “сложная интеграция с бухгалтерией”. Проблема не в цене, а в процессе внедрения.' },
                { title: 'Обнаружен новый сегмент', insight: 'Сегмент «Малые маркетинговые агентства» (12% аудитории) использует функцию отчетов в 3 раза чаще остальных. Это возможность для нового тарифного плана.' },
                { title: 'Сформулирована рекомендация', insight: 'Рекомендуется упростить главный дашборд и убрать виджеты, которые используют менее 5% пользователей, чтобы повысить фокус на ключевых данных.' },
              ].map(item => (
                <div key={item.title} className="bg-background p-6 rounded-lg shadow-card border border-border flex flex-col">
                    <h3 className="font-semibold text-text-primary mb-2">{item.title}</h3>
                    <p className="text-sm text-text-secondary flex-grow">{item.insight}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Analysis Principles (rewritten) --- */}
        <section className="py-20 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Принципы нашего анализа</h2>
              <p className="mt-4 text-lg text-text-secondary">Мы относимся к интерпретации данных так же серьёзно, как и вы. Мы спроектировали нашу модель для минимизации искажений и предоставления проверяемых выводов.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                { title: 'Контекст и сегменты', text: 'Вывод всегда учитывает, кто говорит. Ответ «сложно» от нового пользователя и от опытного — это разные проблемы, и система разделяет их, предотвращая неверные обобщения.' },
                { title: 'Анализ смысла, не ключевых слов', text: 'Модель отличает сарказм от похвалы. Ответ «Отличная цена, спасибо» будет классифицирован как негативный, если контекст указывает на иронию, что исключает ошибки поверхностного анализа.' },
                { title: 'Прозрачность и проверяемость', text: 'Каждый вывод подкреплен реальными анонимными цитатами. Вы можете в любой момент проверить, на каких именно ответах основана рекомендация, и убедиться в её релевантности.' },
              ].map(item => (
                <div key={item.title} className="bg-surface p-6 rounded-lg shadow-card border border-border flex flex-col">
                    <h3 className="font-semibold text-text-primary mb-3">{item.title}</h3>
                    <p className="text-sm text-text-secondary flex-grow">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="py-12 bg-background border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-text-secondary">&copy; {new Date().getFullYear()} Survey Pro. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
