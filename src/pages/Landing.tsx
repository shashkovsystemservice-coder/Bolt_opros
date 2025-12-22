
import { useNavigate } from 'react-router-dom';
import { PieChart, Sparkles, MessageSquare, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Reusable & Styled Components --- //
const ActionButton = ({ onClick, children, className = '' }) => (
    <button 
        onClick={onClick}
        className={`inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-on-primary shadow-sm transition-all duration-200 ease-in-out bg-primary hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 ${className}`}
    >
        {children}
    </button>
);

const FeatureCard = ({ icon, title, description, index }) => (
    <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}
        className="bg-surface/80 backdrop-blur-sm border border-border-subtle rounded-2xl p-8 shadow-ambient transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
    </motion.div>
);

// --- Main Component --- //
export function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Sparkles size={24} strokeWidth={2}/>,
      title: 'Конструктор с AI',
      description: 'Генерируйте вопросы и структуру опроса с помощью искусственного интеллекта, экономя ваше время.',
    },
    {
      icon: <MessageSquare size={24} strokeWidth={2}/>,
      title: 'Интерактивный опыт',
      description: 'Вовлекайте респондентов с помощью уникального чат-режима и динамических вопросов.',
    },
    {
      icon: <PieChart size={24} strokeWidth={2}/>,
      title: 'Гибкая аналитика',
      description: 'Визуализируйте данные в реальном времени, отслеживайте тренды и получайте готовые отчеты.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary overflow-x-hidden">
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sticky top-0 z-50 w-full border-b border-border-subtle/50 bg-background/50 backdrop-blur-lg"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <ClipboardList className="h-7 w-7 text-primary" strokeWidth={2} />
            <span className="text-xl font-semibold tracking-tight">Survey Pro</span>
          </a>
          <ActionButton onClick={() => navigate('/auth')}>Войти</ActionButton>
        </div>
      </motion.header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 text-center overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-100/[0.05] [mask-image:radial-gradient(100%_50%_at_50%_0%,white,transparent)]"></div>
            <div className="container relative mx-auto px-4">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="text-4xl font-bold tracking-tight md:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-text-primary to-text-secondary"
                >
                    От идеи до инсайта — за минуты
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
                    className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary"
                >
                    Survey Pro — это умная платформа для создания опросов, которая помогает вам получать ценные данные и принимать верные решения.
                </motion.p>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
                    className="mt-10"
                >
                    <ActionButton onClick={() => navigate('/auth')} className="h-12 px-8 text-base shadow-lg shadow-primary/20 transform transition-transform duration-300 hover:scale-105">
                        Начать бесплатно
                    </ActionButton>
                </motion.div>
            </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-surface/50 border-y border-border-subtle">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} index={index} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background">
          <div className="container mx-auto flex h-20 items-center justify-center px-4 md:px-6">
              <p className="text-sm text-text-secondary">&copy; {new Date().getFullYear()} Survey Pro. Все права защищены.</p>
          </div>
      </footer>
    </div>
  );
}
