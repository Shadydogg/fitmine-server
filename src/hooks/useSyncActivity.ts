// useSyncActivity.ts — v1.5.1 (JWT + Energy + NFT + Premium)
import { useEffect, useState } from "react";
import axios from "axios";
import { calculateEnergy } from "../lib/calculateEnergy";

interface ActivityData {
  steps: number;
  stepsGoal: number;
  calories: number;
  caloriesGoal: number;
  energy: number;
  energyGoal: number;
  hasNFT: boolean;
  isPremium: boolean;
  loading: boolean;
}

export default function useSyncActivity(): ActivityData {
  const [data, setData] = useState<ActivityData>({
    steps: 0,
    stepsGoal: 10000,
    calories: 0,
    caloriesGoal: 500,
    energy: 0,
    energyGoal: 100,
    hasNFT: false,
    isPremium: false,
    loading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken') || '';
        if (!token || token.length < 20) {
          console.warn('❌ accessToken не найден или недействителен');
          return;
        }

        const res = await axios.post("https://api.fitmine.vip/api/sync", {}, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const d = res.data;

        const energy = calculateEnergy({
          steps: d.steps || 0,
          calories: d.calories || 0,
          activeMinutes: d.minutes || 0,
          hasNFT: d.hasNFT || false,
          isPremium: d.isPremium || false,
          isEarlyAccess: d.isEarlyAccess || false,
        });

        setData({
          steps: d.steps || 0,
          stepsGoal: d.stepsGoal || 10000,
          calories: d.calories || 0,
          caloriesGoal: d.caloriesGoal || 500,
          energy,
          energyGoal: 100,
          hasNFT: d.hasNFT || false,
          isPremium: d.isPremium || false,
          loading: false,
        });
      } catch (err) {
        console.error("❌ Ошибка синхронизации активности:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchData();
  }, []);

  return data;
}
