//v1.3.1 — Responsive + A11y + Clickable
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface Props {
  progress: number; // 0.0 to 1.0
  label: string;
  color?: string; // hex
  onClick?: () => void;
}

export default function Ring({ progress, label, color = "#22c55e", onClick }: Props) {
  const radius = 45;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const progressValue = useMotionValue(0);
  const strokeOffset = useTransform(progressValue, v => circumference - (v / 100) * circumference);
  const display = useTransform(progressValue, v => `${Math.round(v)}%`);

  useEffect(() => {
    const controls = animate(progressValue, progress * 100, {
      duration: 1.5,
      ease: "easeOut",
    });
    return controls.stop;
  }, [progress]);

  return (
    <motion.div
      className="relative w-24 sm:w-28 h-24 sm:h-28 cursor-pointer"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      onClick={onClick}
      aria-label={`Кольцо ${label} заполнено на ${Math.round(progress * 100)}%`}
    >
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="50"
          cy="50"
        />
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeLinecap="round"
          r={normalizedRadius}
          cx="50"
          cy="50"
          style={{
            strokeDashoffset: strokeOffset,
            filter: `drop-shadow(0 0 6px ${color})`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-lg sm:text-xl font-bold text-white">
          {display}
        </motion.span>
        <span className="text-xs text-gray-300 mt-1">{label}</span>
      </div>
    </motion.div>
  );
}
