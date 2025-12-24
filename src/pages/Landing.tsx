
import React from 'react';

// --- Компоненты для вёрстки ---

const Container = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, href, variant = 'primary' }: { children: React.ReactNode, href: string, variant?: 'primary' | 'secondary' }) => {
  const baseClasses = "inline-block text-center px-6 py-3 rounded-md font-medium transition-colors duration-200";
  const variants = {
    primary: "bg-gray-800 text-white hover:bg-gray-700",
    secondary: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50"
  };
  return <a href={href} className={`${baseClasses} ${variants[variant]}`}>{children}</a>;
};

// --- КОМПОНЕНТ СТРАНИЦЫ ---

export function Landing() {
  return (
    <div className="bg-white font-sans text-gray-800">

      {/* 
        ЗАДАЧА: HERO. Позиционирование через ситуацию, а не абстрактные функции.
        Сразу даём понять, для каких задач предназначен инструмент.
      */}
      <header className="border-b border-gray-200">
        <Container className="py-20 md:py-28 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 max-w-3xl mx-auto">
            Платформа для структурированного сбора данных
            <br />
            и управленческой диагностики
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            Для ситуаций, когда важно сначала разобраться,
            а уже потом принимать решения.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button href="/auth" variant="primary">Начать работу</Button>
            <Button href="#how-it-works" variant="secondary">Как это работает</Button>
          </div>
        </Container>
      </header>

      <main>
        {/* 
          ЗАДАЧА: SCENARIO ENTRY. Создать узнавание.
          Показать, что мы понимаем, с какими реальными запросами приходят пользователи.
        */}
        <section className="py-16 md:py-20 bg-gray-50">
            <Container>
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-700">Типичные ситуации для диагностики</h2>
                </div>
                <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div className="bg-white p-4 border border-gray-200 rounded-lg text-sm">Продажи есть, но роста нет</div>
                    <div className="bg-white p-4 border border-gray-200 rounded-lg text-sm">Команда работает, но результат неясен</div>
                    <div className="bg-white p-4 border border-gray-200 rounded-lg text-sm">Хочу понять, что именно требует изменений</div>
                    <div className="bg-white p-4 border border-gray-200 rounded-lg text-sm">Нужно принять решение, но не хватает картины</div>
                </div>
            </Container>
        </section>

        {/* 
          ЗАДАЧА: LAYER 1 — ПЛАТФОРМА. Показать ядро — универсальный инструментарий.
          Фокус на контроле, структуре и самостоятельности.
        */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-semibold">Возможности платформы для самостоятельной работы</h2>
                <p className="mt-4 text-gray-600">Создавайте и используйте инструменты для сбора данных, которые соответствуют вашим задачам. Вы полностью контролируете процесс.</p>
                <ul className="mt-6 space-y-4 text-gray-700">
                  <li className="flex items-start"><span className="text-blue-600 mt-1 mr-3 font-semibold">✓</span><span><b>Конструктор форм:</b> Создавайте опросы, чек-листы и формы с разными типами вопросов.</span></li>
                  <li className="flex items-start"><span className="text-blue-600 mt-1 mr-3 font-semibold">✓</span><span><b>Сбор данных:</b> Организуйте сбор данных внутри компании или с внешними участниками.</span></li>
                  <li className="flex items-start"><span className="text-blue-600 mt-1 mr-3 font-semibold">✓</span><span><b>Анализ результатов:</b> Просматривайте собранные данные в реальном времени и выгружайте их для дальнейшего анализа.</span></li>
                </ul>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 font-mono text-sm text-gray-800">
                <p className="text-gray-500">// Пример структуры простого опроса</p>
                <pre className="mt-4 text-xs overflow-auto">
                  <code>
{`
survey: {
  id: "team-feedback-q3",
  title: "Обратная связь по итогам квартала",
  questions: [
    { 
      type: "rating", 
      text: "Оцените качество взаимодействия в команде" 
    },
    { 
      type: "text", 
      text: "Какие процессы можно улучшить?"
    }
  ]
}
`}
                  </code>
                </pre>
              </div>
            </div>
          </Container>
        </section>

        {/* 
          ЗАДАЧА: LAYER 2 — ЭКСПЕРТНЫЕ СЦЕНАРИИ. Показать дополнительный слой ценности.
          Это не просто конструктор, а инструмент с готовыми аналитическими рамками.
        */}
        <section className="py-16 md:py-24 bg-gray-50">
          <Container>
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Экспертные аналитические сценарии</h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Для сложных задач, где простого опроса недостаточно. Сценарии — это готовые системы диагностики, которые помогают не только собрать данные, но и осмысленно их интерпретировать.</p>
            </div>
            <div className="mt-12 grid md:grid-cols-2 gap-8">
              <article className="bg-white p-6 border border-gray-200 rounded-lg">
                <h3 className="font-semibold">Что это такое?</h3>
                <p className="mt-2 text-sm text-gray-600">Это система вопросов и метрик для диагностики конкретной управленческой задачи, например, «Анализ причин оттока» или «Оценка зрелости процессов».</p>
              </article>
              <article className="bg-white p-6 border border-gray-200 rounded-lg">
                <h3 className="font-semibold">Как это помогает в анализе?</h3>
                <p className="mt-2 text-sm text-gray-600">Сценарий подсвечивает ключевые метрики, показывает распределения и даёт профессиональные ориентиры для размышлений, но не генерирует автоматических советов.</p>
              </article>
            </div>
          </Container>
        </section>
        
        {/* 
          ЗАДАЧА: ПРОЦЕСС. Сделать продукт предсказуемым.
        */}
        <section id="how-it-works" className="py-16 md:py-24">
          <Container>
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Процесс работы</h2>
            </div>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">1</div>
                <h3 className="mt-2 font-semibold">Выбор инструмента</h3>
                <p className="mt-1 text-sm text-gray-600">Создайте свою форму с нуля или выберите готовый экспертный сценарий.</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">2</div>
                <h3 className="mt-2 font-semibold">Сбор данных</h3>
                <p className="mt-1 text-sm text-gray-600">Пригласите участников и соберите информацию в структурированном виде.</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">3</div>
                <h3 className="mt-2 font-semibold">Анализ результатов</h3>
                <p className="mt-1 text-sm text-gray-600">Изучите данные самостоятельно или используйте аналитическую рамку сценария.</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">4</div>
                <h3 className="mt-2 font-semibold">Принятие решений</h3>
                <p className="mt-1 text-sm text-gray-600">На основе анализа сформулируйте выводы и спланируйте дальнейшие действия.</p>
              </div>
            </div>
          </Container>
        </section>

        {/* 
          ЗАДАЧА: ГРАНИЦЫ. Укрепить доверие через честность.
        */}
        <section className="py-16 md:py-24 bg-gray-50">
          <Container>
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Границы ответственности</h2>
            </div>
            <div className="mt-8 max-w-2xl mx-auto text-gray-700 bg-white border border-yellow-400 rounded-lg p-6">
              <p className="font-semibold text-gray-900">Платформа — это инструмент для повышения качества решений, а не их автоматическая замена.</p>
              <ul className="mt-4 list-disc list-inside text-sm space-y-2">
                <li>Инструмент предоставляет данные и модели, но не генерирует готовых ответов.</li>
                <li>Интерпретация результатов и принятие решений всегда остаётся на стороне пользователя.</li>
                <li>Экспертные сценарии не могут учесть уникальный контекст каждой компании без его дополнительного анализа.</li>
              </ul>
            </div>
          </Container>
        </section>
        
      </main>

      {/*
        ЗАДАЧА: LAYER 3 (АВТОРСТВО) и Финальный CTA.
      */}
      <footer className="border-t border-gray-200">
        <Container className="py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold">Готовы начать работу?</h3>
              <p className="mt-2 text-gray-600">Если вам нужен спокойный и структурированный подход к диагностике, платформа может стать вашим рабочим инструментом.</p>
              <div className="mt-6">
                <Button href="/auth" variant="primary">Начать работу</Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold">Об авторстве сценариев</h4>
              <p className="mt-2 text-sm text-gray-600">Экспертные сценарии разработаны автором платформы на основе опыта в управленческом консалтинге. Они отражают профессиональный аналитический подход и не являются автоматическими рекомендациями.</p>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Platform. Все права защищены.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
