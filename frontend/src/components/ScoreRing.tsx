import { motion } from "framer-motion";
import type { OutdoorScore, ScoreGrade } from "shared";
import { gradeColor } from "../lib/colors";

const GRADE_MESSAGE: Record<ScoreGrade, string> = {
	최적: "☀️ 나들이 가기 딱 좋은 날이에요!",
	좋음: "🌤️ 밖에 나가기 좋은 날씨예요",
	보통: "🌥️ 나쁘지 않지만 컨디션 체크하세요",
	주의: "🌧️ 외출 시 주의가 필요해요",
	위험: "⛔ 실내 활동을 추천드려요",
};

const BREAKDOWN = [
	{ key: "airQualityScore", label: "대기질" },
	{ key: "weatherScore", label: "날씨" },
	{ key: "uvScore", label: "자외선" },
] as const;

function barColor(value: number): string {
	if (value >= 80) return "var(--color-score-optimal)";
	if (value >= 60) return "var(--color-score-good)";
	if (value >= 40) return "var(--color-score-moderate)";
	if (value >= 20) return "var(--color-score-caution)";
	return "var(--color-score-danger)";
}

export function ScoreRing({ score }: { score: OutdoorScore }) {
	const color = gradeColor(score.grade);
	const circumference = 2 * Math.PI * 52;
	const offset = circumference - (score.total / 100) * circumference;

	return (
		<div className="flex flex-col items-center gap-3">
			<svg width="140" height="140" viewBox="0 0 120 120" aria-label={`적합도 ${score.total}점`}>
				<circle
					cx="60"
					cy="60"
					r="52"
					fill="none"
					stroke="var(--border-default)"
					strokeWidth="12"
				/>
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

			<p className="text-sm text-(--text-secondary)">{GRADE_MESSAGE[score.grade]}</p>

			{/* 세부 점수 */}
			<div className="w-full max-w-[220px] space-y-2">
				{BREAKDOWN.map(({ key, label }) => {
					const value = score[key];
					return (
						<div key={key} className="flex items-center gap-2 text-xs">
							<span className="w-12 shrink-0 text-(--text-muted)">{label}</span>
							<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--border-default)">
								<motion.div
									className="h-full rounded-full"
									style={{ backgroundColor: barColor(value) }}
									initial={{ width: 0 }}
									animate={{ width: `${value}%` }}
									transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
								/>
							</div>
							<span className="w-7 text-right tabular-nums text-(--text-secondary)">{value}</span>
						</div>
					);
				})}
			</div>

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
