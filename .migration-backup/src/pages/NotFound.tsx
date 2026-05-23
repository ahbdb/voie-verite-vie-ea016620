import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950">
      <div className="text-center dark:text-slate-100">
        <h1 className="text-4xl font-bold mb-4">{t('notFound.title')}</h1>
        <p className="text-xl text-gray-600 dark:text-slate-300 mb-4">{t('notFound.message')}</p>
        <a href="/" className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline">
          {t('notFound.link')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
