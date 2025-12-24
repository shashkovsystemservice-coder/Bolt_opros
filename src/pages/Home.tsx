
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { ArrowRight, Bot, Feather, BarChart2 } from 'lucide-react';

export function Home() {
  return (
    <div className="bg-background text-text-primary min-h-screen flex flex-col font-sans">
      <Header />
      
      {/* --- Hero Section --- */}
      <main className="flex-grow flex items-center justify-center">
        <div className="container mx-auto px-4 text-center py-20 md:py-32">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tighter mb-4 leading-tight">
            От идеи до инсайта — за минуты
          </h1>
          <p className="max-w-2xl mx-auto text-md md:text-lg text-text-secondary mb-8">
            Survey Pro — это умная платформа для создания опросов, которая помогает вам получать ценные данные и принимать верные решения.
          </p>
          <div className="flex justify-center items-center gap-4">
            <Link
              to="/survey/create"
              className="inline-flex items-center justify-center h-11 px-6 font-medium text-white bg-primary rounded-lg transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Начать бесплатно <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>

      {/* --- Features Section --- */}
      <section className="bg-background-contrast py-16 md:py-24">
          <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                  <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-12 h-12 mb-4 bg-surface-contrast rounded-full">
                        <Bot size={24} className="text-primary"/>
                      </div>
                      <h3 className="text-lg font-medium text-text-primary mb-2">Конструктор с AI</h3>
                      <p className="text-text-secondary">Генерируйте вопросы и структуру опроса с помощью искусственного интеллекта, экономя ваше время.</p>
                  </div>
                  <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-12 h-12 mb-4 bg-surface-contrast rounded-full">
                        <Feather size={24} className="text-primary"/>
                      </div>
                      <h3 className="text-lg font-medium text-text-primary mb-2">Интерактивный опыт</h3>
                      <p className="text-text-secondary">Вовлекайте респондентов с помощью уникального чат-режима и динамических вопросов.</p>
                  </div>
                  <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-12 h-12 mb-4 bg-surface-contrast rounded-full">
                        <BarChart2 size={24} className="text-primary"/>
                      </div>
                      <h3 className="text-lg font-medium text-text-primary mb-2">Гибкая аналитика</h3>
                      <p className="text-text-secondary">Визуализируйте данные в реальном времени, отслеживайте тренды и получайте готовые отчеты.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-text-secondary">&copy; {new Date().getFullYear()} Survey Pro. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
