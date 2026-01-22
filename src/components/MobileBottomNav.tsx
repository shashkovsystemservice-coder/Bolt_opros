
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart2, Users, Settings, Plus, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { path: '/dashboard/surveys', icon: Home, label: 'Главная' },
  { path: '/dashboard/responses', icon: BarChart2, label: 'Ответы' },
  { path: '/reports', icon: FileText, label: 'Отчеты' },
  { path: '/dashboard/contacts', icon: Users, label: 'Контакты' },
  { path: '/dashboard/settings', icon: Settings, label: 'Настройки' },
];

const NavItem = ({ item }) => {
  const { pathname } = useLocation();
  const isActive = pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      className="flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200"
    >
      <item.icon size={22} className={isActive ? 'text-primary' : 'text-text-secondary'} />
      <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
        {item.label}
      </span>
    </NavLink>
  );
};

const CreateSurveyFab = () => {
  const navigate = useNavigate();
  return (
    <motion.button
      onClick={() => navigate('/survey/create')}
      initial={{ scale: 0, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, y: 50 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center"
    >
      <Plus size={28} className="text-text-on-primary" />
    </motion.button>
  )
}

export const MobileBottomNav = () => {
  const { pathname } = useLocation();
  // Показываем кнопку только на страницах из navItems
  const showFab = navItems.some(item => pathname.startsWith(item.path));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 h-20 bg-surface/80 backdrop-blur-lg border-t border-border-subtle md:hidden z-50"
      >
        <div className="w-full h-full max-w-md mx-auto relative">
          {showFab && <CreateSurveyFab />}
          <div className="flex items-center justify-around h-full">
            {navItems.map((item) => <NavItem key={item.path} item={item} />)}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
