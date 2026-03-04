import { motion } from "framer-motion";
import type { OutdoorScore } from "shared";
import { gradeColor } from "../lib/colors";

export function ScoreRing({ score }: { score: OutdoorScore }) {
	const color = gradeColor(score.grade);
	const circumference = 2 * Math.PI * 52;
	const offset = circumference - (score.total / 100) * circumference;

	return (
		<div className="flex flex-col items-center gap-2">
			<svg width="140" height="140" viewBox="0 0 120 120" aria-label={`적합도 ${score.total}점`}>
				<circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-default)" strokeWidth="12" />
				<motion.circle
					cx="60"
					cy="60"
					r="52"
					fill="none"
					stroke={color}
					strokeWidth="12"
					strokeLinecap="round"
					strokeDasharray={circumference}
					initial={{ strokeDashoffset: circumference }}
					animate={{ strokeDashoffset: offset }}
					transition={{ duration: 1, ease: "easeOut" }}
					transform="rotate(-90 60 60)"
				/>
				<text x="60" y="68" textAnchor="middle" className="text-3xl font-bold" fill={color}>
					{score.total}
				</text>
				<text x="60" y="85" textAnchor="middle" className="text-xs" fill="var(--text-muted)">
					/100
				</text>
			</svg>
			<span className="text-sm font-medium" style={{ color }}>
				{score.grade}
			</span>
			{score.wbgtOverride && (
				<span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-(--color-error)">
					🌡️ 열 스트레스 경고
				</span>
			)}
			{score.healthBlockActive && (
				<span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-500">
					⚠️ 보건 가이드라인 차단
				</span>
			)}
		</div>
	);
}
