
import React from 'react';
import { Link as ScrollLink } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';

// --- Компоненты для вёрстки ---

const Container = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

// ИСПРАВЛЕННЫЙ компонент Button
const Button = ({ children, to, variant = 'primary' }: { children: React.ReactNode, to: string, variant?: 'primary' | 'secondary' }) => {
  const baseClasses = "inline-block text-center px-6 py-3 rounded-md font-medium transition-colors duration-200 cursor-pointer";
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-transparent text-black border border-gray-300 hover:bg-gray-100"
  };
  const className = `${baseClasses} ${variants[variant]}`;

  // Если ссылка внутренняя (начинается с /), используем RouterLink
  if (to.startsWith('/')) {
    return (
      <RouterLink to={to} className={className}>
        {children}
      </RouterLink>
    );
  }

  // Иначе, используем ScrollLink для плавной прокрутки
  return (
    <ScrollLink to={to} spy={true} smooth={true} duration={500} offset={-70} className={className}>
      {children}
    </ScrollLink>
  );
};

const Section = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
    <section id={id} className={`py-16 sm:py-20 ${className}`}>
        {children}
    </section>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-3xl font-bold tracking-tight text-center text-gray-900">{children}</h2>
);

const SectionText = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <p className={`mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto ${className}`}>{children}</p>
);

// --- Секции страницы (с обновленными кнопками) ---

const HeroSection = () => (
    <Section className="text-center pt-24 pb-24 sm:pt-32 sm:pb-32">
        <Container>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                Платформа для работы с опросами
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
                Профессиональный инструмент для создания и проведения опросов. Получайте структурированные исходные данные для вашей работы.
            </p>
            <div className="mt-10 flex justify-center gap-x-4">
                {/* ИЗМЕНЕНО: href на to, убран # */}
                <Button to="start" variant="primary">Начать работу</Button>
                <Button to="how-it-works" variant="secondary">Как это работает</Button>
            </div>
        </Container>
    </Section>
);

const ProblemSection = () => (
    <Section className="bg-gray-50" id="how-it-works">
        <Container>
            <SectionTitle>От формы к данным</SectionTitle>
            <SectionText>
                Качество исходных данных напрямую зависит от того, как был спроектирован опрос и насколько удобно было на него отвечать. Хаотичные формы с непродуманной структурой приводят к неточным или поверхностным ответам. Чтобы получать качественные данные, нужен системный подход на каждом этапе — от постановки вопроса до организации процесса сбора ответов.
            </SectionText>
        </Container>
    </Section>
);

const FeatureList = ({ items }: { items: { title: string; description: string }[] }) => (
    <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:gap-12">
        {items.map(item => (
            <div key={item.title}>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-base text-gray-600">{item.description}</p>
            </div>
        ))}
    </div>
);

const CreationSection = () => (
    <Section>
        <Container>
            <div className="text-center">
                <SectionTitle>Продуманная структура на старте</SectionTitle>
                <SectionText>
                    Платформа даёт всё необходимое для проектирования корректных и логичных опросов.
                </SectionText>
            </div>
            <FeatureList items={[
                { title: "Гибкий конструктор", description: "Работайте с разными типами вопросов и настраивайте логику переходов." },
                { title: "Генерация вопросов", description: "Используйте AI для создания и улучшения формулировок на основе ваших задач." },
                { title: "Шаблоны", description: "Начинайте с проверенных структур для типовых задач." },
                { title: "Управление опросами", description: "Создавайте, дублируйте и архивируйте опросы в едином рабочем пространстве." },
            ]} />
        </Container>
    </Section>
);

const AnsweringSection = () => (
    <Section className="bg-gray-50">
        <Container>
            <div className="text-center">
                <SectionTitle>Удобство в процессе ответа</SectionTitle>
                <SectionText>
                    Качество ответов зависит от того, насколько респонденту удобно и понятно проходить опрос. Мы уделили этому этапу особое внимание.
                </SectionText>
            </div>
            <FeatureList items={[
                { title: "Понятный интерфейс", description: "Ничего лишнего. Только вопросы и поле для ответа. Помогает сфокусироваться на сути." },
                { title: "Комфортный ритм", description: "Один вопрос — один экран. Респондент движется по опросу последовательно и не теряет контекст." },
                { title: "Адаптивность", description: "Опросы корректно отображаются и легко проходятся на любых устройствах, включая смартфоны." },
            ]} />
        </Container>
    </Section>
);

const ResultSection = () => (
    <Section>
        <Container className="text-center">
            <SectionTitle>Ваши исходные данные</SectionTitle>
            <SectionText>По итогам работы вы получаете:</SectionText>
            <ul className="mt-8 space-y-2 text-lg text-gray-600 inline-block text-left">
                <li className="flex items-center"><svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Корректно оформленные опросы</li>
                <li className="flex items-center"><svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Структурированные ответы в едином формате</li>
                <li className="flex items-center"><svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Аккуратную базу данных по каждому опросу</li>
                <li className="flex items-center"><svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Исходные данные, готовые к дальнейшей работе</li>
            </ul>
        </Container>
    </Section>
);

const ForWhomSection = () => (
    <Section className="bg-gray-50">
        <Container className="text-center">
            <SectionTitle>Кому подходит</SectionTitle>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="p-4"><p className="text-lg font-medium text-gray-800">Компании</p><p className="text-sm text-gray-500">для внутренних и внешних исследований.</p></div>
                <div className="p-4"><p className="text-lg font-medium text-gray-800">Консультанты</p><p className="text-sm text-gray-500">для работы над клиентскими проектами.</p></div>
                <div className="p-4"><p className="text-lg font-medium text-gray-800">Исследователи</p><p className="text-sm text-gray-500">для сбора данных в рамках своих задач.</p></div>
                <div className="p-4"><p className="text-lg font-medium text-gray-800">Продуктовые команды</p><p className="text-sm text-gray-500">для изучения пользователей.</p></div>
            </div>
        </Container>
    </Section>
);

const BoundariesSection = () => (
    <Section>
        <Container className="max-w-3xl">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
                <h3 className="text-xl font-bold text-yellow-900">Что платформа не делает</h3>
                <p className="mt-3 text-yellow-800">
                    Мы фокусируемся на качестве формы и процесса сбора данных. Платформа <strong>не заменяет</strong> вашу экспертизу, <strong>не проводит</strong> автоматический анализ и <strong>не даёт</strong> готовых рекомендаций. Наша задача — обеспечить вас качественными исходными данными для вашей дальнейшей работы.
                </p>
            </div>
        </Container>
    </Section>
);

const FinalCTASection = () => (
    <Section className="bg-gray-900 text-white" id="start">
        <Container className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Начать работу с опросами</h2>
            <p className="mt-4 text-lg text-gray-300">
                Создайте свой первый опрос или посмотрите, как работает платформа.
            </p>
            <div className="mt-8">
                 {/* ИЗМЕНЕНО: href на to, ссылка на /auth */}
                <Button to="/auth" variant="primary">Начать работу</Button>
            </div>
        </Container>
    </Section>
);

const Footer = () => (
    <footer className="bg-white">
        <Container className="py-6 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} SurveyPlatform. Все права защищены.</p>
        </Container>
    </footer>
)

// --- Главный компонент страницы ---

export const Landing = () => {
    return (
        <div className="bg-white">
            <main>
                <HeroSection />
                <ProblemSection />
                <CreationSection />
                <AnsweringSection />
                <ResultSection />
                <ForWhomSection />
                <BoundariesSection />
                <FinalCTASection />
            </main>
            <Footer />
        </div>
    );
};
