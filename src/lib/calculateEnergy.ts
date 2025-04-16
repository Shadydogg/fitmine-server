// v1.0.0 — calculateEnergy.ts

interface EnergyInput {
  steps: number;
  calories: number;
  activeMinutes: number;
  hasNFT?: boolean;
  isPremium?: boolean;
  isEarlyAccess?: boolean;
}

export function calculateEnergy({
  steps,
  calories,
  activeMinutes,
  hasNFT = false,
  isPremium = false,
  isEarlyAccess = false
}: EnergyInput): number {
  // Базовые нормированные значения (0–1)
  const stepScore = Math.min(steps / 10000, 1);
  const calScore = Math.min(calories / 500, 1);
  const minScore = Math.min(activeMinutes / 30, 1);

  // Весовые коэффициенты: шаги 40%, калории 30%, активность 30%
  const baseEnergy = (stepScore * 0.4 + calScore * 0.3 + minScore * 0.3);

  // Бонусы
  const bonus =
    (hasNFT ? 0.10 : 0) +
    (isPremium ? 0.15 : 0) +
    (isEarlyAccess ? 0.10 : 0);

  // Финальный результат (максимум 100)
  let total = Math.floor((baseEnergy + bonus) * 100);
  if (total > 100) total = 100;

  return total;
}
