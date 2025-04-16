//v1.4.1
import Ring from "./Ring";
import Tooltip from "./Tooltip";
import useSyncActivity from "../hooks/useSyncActivity";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function DashboardSummary() {
  const { t } = useTranslation();

  const {
    steps,
    stepsGoal,
    calories,
    caloriesGoal,
    hasNFT,
    isPremium,
    loading,
  } = useSyncActivity();

  const energy = Math.min(
    (steps / stepsGoal) * 0.5 +
      (calories / caloriesGoal) * 0.5 +
      (isPremium ? 0.1 : 0) +
      (hasNFT ? 0.1 : 0),
    1
  );

  if (loading) {
    return (
      <div className="text-gray-400 text-sm text-center animate-pulse">
        {t("dashboard.loading", "Загрузка данных активности...")}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center gap-8 py-6">
      <motion.div
        className="text-2xl font-semibold text-white drop-shadow tracking-wide mb-2"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {t("dashboard.title", "Твоя активность сегодня")}
      </motion.div>

      <motion.div
        className="flex flex-row items-center justify-center gap-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <Tooltip content={t("tooltip.steps")}>
          <Ring
            progress={stepsGoal ? steps / stepsGoal : 0}
            label={t("ring.steps", "Шаги")}
            color="#00DBDE"
          />
        </Tooltip>

        <Tooltip content={t("tooltip.calories")}>
          <Ring
            progress={caloriesGoal ? calories / caloriesGoal : 0}
            label={t("ring.calories", "Калории")}
            color="#FF5F6D"
          />
        </Tooltip>

        <Tooltip content={t("tooltip.energy")}>
          <Ring
            progress={energy}
            label={t("ring.energy", "Энергия")}
            color="#FCEE09"
          />
        </Tooltip>
      </motion.div>
    </div>
  );
}
