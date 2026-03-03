import type { OutdoorScore } from "shared";
import { gradeColor } from "../lib/colors";

export function ScoreRing({ score }: { score: OutdoorScore }) {
	const color = gradeColor(score.grade);
	const circumference = 2 * Math.PI * 54;
	const offset = circumference - (score.total / 100) * circumference;

	return (
		<div className="flex flex-col items-center gap-2">
			<svg width="140" height="140" viewBox="0 0 120 120" aria-label={`적합도 ${score.total}점`}>
				<circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
				<circle
					cx="60"
					cy="60"
					r="54"
					fill="none"
					stroke={color}
					strokeWidth="8"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					transform="rotate(-90 60 60)"
				/>
				<text x="60" y="55" textAnchor="middle" className="text-3xl font-bold" fill={color}>
					{score.total}
				</text>
				<text x="60" y="72" textAnchor="middle" className="text-xs" fill="#94a3b8">
					/100
				</text>
			</svg>
			<span className="text-sm font-medium" style={{ color }}>
				{score.grade}
			</span>
			{score.wbgtOverride && (
				<span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
					🌡️ 열 스트레스 경고
				</span>
			)}
			{score.healthBlockActive && (
				<span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
					⚠️ 보건 가이드라인 차단
				</span>
			)}
		</div>
	);
}
