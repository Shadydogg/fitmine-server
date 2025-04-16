//v1.3.4 с кнопкой XP и stagger-анимацией
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useSyncActivity from "../hooks/useSyncActivity";
import DashboardSummary from "../components/DashboardSummary";
import AnimatedBackground from "../components/AnimatedBackground";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading } = useSyncActivity();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black text-white">

      <AnimatedBackground />

      {/* Профиль */}
      <button
        onClick={() => navigate("/profile")}
        className="absolute top-4 right-4 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-transform"
      >
        <img
          src={user?.photo_url || "/default-avatar.png"}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      </button>

      {/* Кнопка XP */}
      <motion.button
        onClick={() => navigate("/xp")}
        className="absolute top-4 left-4 px-3 py-1 rounded-full text-sm bg-fit-gradient shadow-glow hover:scale-105 transition-glow"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        🎯 XP и Уровень
      </motion.button>

      {/* Заголовок */}
      <motion.h1
        className="text-3xl font-extrabold mt-12 mb-4 text-center tracking-wide z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {t("dashboard.title", "Твоя активность сегодня")}
      </motion.h1>

      {/* Контент */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.2,
              delayChildren: 0.5,
            },
          },
        }}
      >
        {loading ? (
          <div className="text-gray-500 mt-6 animate-pulse z-10">
            {t("dashboard.loading", "Загрузка активности...")}
          </div>
        ) : (
          <>
            <DashboardSummary />
            <motion.div
              className="mt-8 text-center text-sm text-gray-400 max-w-sm z-10"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              {t("dashboard.motivation", "Открой все кольца и получи бонус!")}
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
