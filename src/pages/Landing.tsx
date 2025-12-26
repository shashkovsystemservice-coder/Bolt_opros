
import React from 'react';

// --- Компоненты для вёрстки (без изменений) ---

const Container = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
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


// --- НОВАЯ ВЕРСИЯ ГЛАВНОЙ СТРАНИЦЫ: ВВЕДЕНИЕ В ИНСТРУМЕНТ ---

export function Landing() {
  return (
    <div className="bg-white font-sans text-gray-800">

      {/*
        1. HERO-БЛОК
        Комментарий: Спокойный, инструментальный вход. Заголовок определяет функцию, а не обещает результат.
      */}
      <header className="border-b border-gray-200">
        <Container className="py-24 md:py-32 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
            Инструмент для прояснения ситуации
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            Структурированный сбор данных и диагностические сценарии для работы с неопределённостью.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button href="/auth" variant="primary">Начать диагностику</Button>
            <Button href="#example" variant="secondary">Посмотреть пример</Button>
          </div>
        </Container>
      </header>

      <main>

        {/*
          2. БЛОК «Опрос, чек-лист, сценарий — в чём разница?»
          Комментарий: Чёткое разделение понятий, которое подчёркивает аналитическую ценность сценария.
        */}
        <section className="py-20 md:py-24 bg-gray-50">
          <Container>
            <div className="text-center">
              <h2 className="text-3xl font-semibold">Опрос, чек-лист, сценарий — в чём разница?</h2>
            </div>
            <div className="mt-12 grid md:grid-cols-3 gap-8 text-left">
              <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold">Опрос</h4>
                <p className="mt-2 text-sm text-gray-600">Фиксирует мнения и ответы на прямые вопросы.</p>
              </div>
              <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold">Чек-лист</h4>
                <p className="mt-2 text-sm text-gray-600">Проверяет соответствие и факт выполнения.</p>
              </div>
              <div className="p-6 bg-white border border-blue-200 rounded-lg ring-1 ring-blue-500">
                <h4 className="font-semibold text-blue-800">Диагностический сценарий</h4>
                <p className="mt-2 text-sm text-gray-600">Выявляет структуру состояния, связи и напряжения в системе. Это не форма, а логика анализа.</p>
              </div>
            </div>
          </Container>
        </section>

        {/*
          3. БЛОК «Платформа — это рабочее пространство»
          Комментарий: Позиционирование платформы как среды для мышления, с использованием ключевых слов.
        */}
        <section className="py-20 md:py-24">
            <Container>
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-semibold">Платформа — это рабочее пространство</h2>
                        <p className="mt-4 text-gray-600">Это интерфейс для мышления, а не его замена. Платформа не даёт советов, а предоставляет <span class="font-medium">рамку</span> для структурирования вопросов, сбора данных и <span class="font-medium">фиксации</span> целостной <span class="font-medium">картины</span> состояния для дальнейшего анализа.</p>
                    </div>
                    <div className="font-mono text-sm text-gray-800 bg-gray-100 p-6 rounded-lg border border-gray-200">
                        <p className="text-gray-500">// Сценарий как аналитическая рамка</p>
                        <pre className="mt-4 text-xs overflow-auto">
{`
scenario: {
  name: "Анализ узких мест",
  metrics: ["скорость", "качество"],
  questions: [
    { target: "скорость", ... },
    { target: "качество", ... },
  ]
}
`}
                        </pre>
                    </div>
                </div>
            </Container>
        </section>

        {/*
          4. ПРИМЕР
          Комментарий: Демонстрация образа мышления. Фокус на том, какой точный вопрос становится возможно задать.
        */}
        <section id="example" className="py-20 md:py-24 bg-gray-50">
          <Container>
            <div className="text-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Пример диагностического мышления</h2>
                <h3 className="mt-3 text-3xl font-semibold">Сценарий «Диагностика выгорания команды»</h3>
            </div>
            <div className="mt-12 bg-white border border-gray-200 rounded-lg p-8">
                <h4 className="font-semibold">Анализируемые оси</h4>
                <p className="mt-2 text-gray-600">Сценарий измеряет три системных фактора:</p>
                <ul className="mt-4 grid md:grid-cols-3 gap-6">
                    <li><span className="font-semibold text-gray-900">1. Истощение:</span> Ощущение исчерпанности ресурсов.</li>
                    <li><span className="font-semibold text-gray-900">2. Цинизм:</span> Отстранённое отношение к работе.</li>
                    <li><span className="font-semibold text-gray-900">3. Неэффективность:</span> Ощущение некомпетентности.</li>
                </ul>
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <h4 className="font-semibold">Что проясняется</h4>
                    <p className="mt-2 text-gray-600">Вместо общего «все устали», появляется карта напряжений. Она позволяет задать точный вопрос:</p>
                    <p className="mt-4 text-lg font-medium text-gray-900 bg-yellow-50 p-4 rounded-md">
                        «Данные показывают высокий уровень неэффективности при умеренном истощении. Вероятно, проблема не в нагрузке, а в том, что команда не видит ценности своей работы. Почему так происходит?»
                    </p>
                </div>
            </div>
          </Container>
        </section>

        {/*
          5. ПРОЦЕСС РАБОТЫ
          Комментарий: Сухое, констатирующее описание шагов.
        */}
        <section className="py-20 md:py-24">
            <Container>
                <div className="text-center">
                    <h2 className="text-3xl font-semibold">Процесс работы</h2>
                </div>
                <div className="mt-12 grid sm:grid-cols-4 gap-8 text-center">
                    <div><div className="text-4xl font-bold text-gray-200">1</div><h3 className="mt-2 font-semibold">Выбор рамки</h3><p className="mt-1 text-sm text-gray-600">Выбор готового сценария или создание своей структуры.</p></div>
                    <div><div className="text-4xl font-bold text-gray-200">2</div><h3 className="mt-2 font-semibold">Сбор данных</h3><p className="mt-1 text-sm text-gray-600">Организация сбора информации от участников.</p></div>
                    <div><div className="text-4xl font-bold text-gray-200">3</div><h3 className="mt-2 font-semibold">Прояснение картины</h3><p className="mt-1 text-sm text-gray-600">Анализ данных для фиксации состояния системы.</p></div>
                    <div><div className="text-4xl font-bold text-gray-200">4</div><h3 className="mt-2 font-semibold">Основа для решений</h3><p className="mt-1 text-sm text-gray-600">Использование картины для формулирования гипотез.</p></div>
                </div>
            </Container>
        </section>

        {/*
          6. БЛОК «Инструмент даёт структуру, а не ответы»
          Комментарий: Критически важный блок для управления ожиданиями пользователя.
        */}
        <section className="py-20 md:py-24 bg-gray-50">
          <Container>
            <div className="text-center">
              <h2 className="text-3xl font-semibold">Инструмент даёт структуру, а не ответы</h2>
            </div>
            <div className="mt-12 grid md:grid-cols-2 gap-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900">Что инструмент даёт:</h3>
                    <ul className="mt-4 list-disc list-inside text-gray-700 space-y-2">
                        <li>Структуру для мышления</li>
                        <li>Карту фактического состояния системы</li>
                        <li>Прояснение реальных проблемных зон</li>
                        <li>Надёжную опору для анализа</li>
                    </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900">Чего инструмент не делает:</h3>
                    <ul className="mt-4 list-disc list-inside text-gray-700 space-y-2">
                        <li>Не генерирует готовые решения</li>
                        <li>Не даёт автоматических советов</li>
                        <li>Не заменяет вашу экспертизу</li>
                        <li>Не является источником «правды»</li>
                    </ul>
                </div>
            </div>
          </Container>
        </section>

        {/*
          7. ГРАНИЦЫ ОТВЕТСТВЕННОСТИ
          Комментарий: Ключевой блок для построения доверия с профессиональной аудиторией.
        */}
        <section className="py-20 md:py-24">
          <Container>
            <div className="text-center max-w-3xl mx-auto bg-yellow-50 p-8 border border-yellow-300 rounded-lg">
                <h2 className="text-2xl font-semibold">Границы ответственности</h2>
                <p className="mt-4 text-gray-700">Это не консультация, не автоматический анализ и не экспертное заключение. Это инструмент. Качество выводов полностью зависит от аналитических способностей пользователя и его знания уникального контекста. Ответственность за интерпретацию данных и принятые на их основе решения всегда остаётся на стороне человека.</p>
            </div>
          </Container>
        </section>

      </main>

      {/*
        8. ФИНАЛ
        Комментарий: Спокойное приглашение в рабочую среду.
      */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <Container className="py-20 text-center">
          <h2 className="text-3xl font-semibold">Если важно сначала разобраться, а не действовать вслепую</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Этот инструмент может быть полезен.</p>
          <div className="mt-8">
            <Button href="/auth" variant="primary">Перейти в рабочее пространство</Button>
          </div>
        </Container>
      </footer>

    </div>
  );
}
