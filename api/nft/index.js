const express = require("express");
const router = express.Router();
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");

router.get("/", async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;
    const today = new Date().toISOString().slice(0, 10);

    // Получаем EP и премиум-статус пользователя
    const { data: activity, error: activityError } = await supabase
      .from("user_activity")
      .select("ep")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .single();

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("is_premium")
      .eq("telegram_id", telegram_id)
      .single();

    const ep = activity?.ep || 0;
    const isPremium = !!profile?.is_premium;

    if (activityError && activityError.code !== "PGRST116") {
      console.warn("[NFT API] Ошибка загрузки активности:", activityError.message);
    }

    if (profileError) {
      console.warn("[NFT API] Ошибка загрузки профиля:", profileError.message);
    }

    // Загружаем NFT майнеров
    const { data: nfts, error: nftError } = await supabase
      .from("nft_miners")
      .select("*")
      .eq("telegram_id", telegram_id);

    if (nftError) {
      console.error("[NFT API] Ошибка загрузки NFT:", nftError.message);
      return res.status(500).json({ error: "Failed to load NFTs" });
    }

    const updated = nfts.map((nft) => {
      const base = Number(nft.base_hashrate) || 0;
      const level = nft.level || 1;
      const land = parseFloat(nft.land_bonus) || 1.0;
      const components = nft.components || [];

      const componentBonus = components.reduce((acc, c) => acc + (c?.bonusPercent || 0), 0);
      const componentMultiplier = 1 + componentBonus / 100;
      const levelMultiplier = 1 + level * 0.1;

      const epMultiplier = ep > 0 ? ep / 1000 : 0;
      const premiumBase = isPremium ? 0.5 : 0;
      const effectiveEP = ep > 0 ? epMultiplier : premiumBase;

      const totalPower = base * componentMultiplier * land * levelMultiplier * effectiveEP;

      return {
        ...nft,
        baseHashrate: base,
        landBonus: land,
        miningPower: Math.round(totalPower),
        componentBonus,
        isPremium,
        ep,
        effectiveEP: parseFloat(effectiveEP.toFixed(3)),
      };
    });

    return res.json(updated);
  } catch (err) {
    console.error("[NFT API] Ошибка авторизации:", err.message);
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;
