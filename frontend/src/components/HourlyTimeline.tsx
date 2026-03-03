import type { HourlyScore } from "shared";
import { gradeColor } from "../lib/colors";

const POINT_GAP = 64;
const PADDING_X = 24;
const PADDING_TOP = 20;
const CHART_H = 100;
const SVG_H = 170;

export function HourlyTimeline({ hours }: { hours: HourlyScore[] }) {
	if (hours.length === 0) return null;

	const svgW = PADDING_X * 2 + (hours.length - 1) * POINT_GAP;

	const points = hours.map((h, i) => ({
		x: PADDING_X + i * POINT_GAP,
		y: PADDING_TOP + CHART_H - (h.score / 100) * CHART_H,
		...h,
	}));

	const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

	const gradientPath = `${linePath} L${points[points.length - 1].x},${PADDING_TOP + CHART_H} L${points[0].x},${PADDING_TOP + CHART_H} Z`;

	return (
		<div className="rounded-2xl bg-(--bg-card) p-5 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-(--text-secondary)">시간대별 전망</h3>
			<div className="overflow-x-auto">
				<svg
					width={svgW}
					height={SVG_H}
					className="min-w-full"
					role="img"
					aria-label="시간대별 야외활동 적합도 차트"
				>
					<defs>
						<linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.2} />
							<stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
						</linearGradient>
					</defs>

					{/* 영역 채우기 */}
					<path d={gradientPath} fill="url(#areaFill)" />

					{/* 라인 */}
					<path
						d={linePath}
						fill="none"
						stroke="var(--color-brand)"
						strokeWidth={2}
						strokeLinejoin="round"
					/>

					{/* 포인트 + 라벨 */}
					{points.map((p) => (
						<g key={p.hour}>
							<circle
								cx={p.x}
								cy={p.y}
								r={4}
								fill={gradeColor(p.grade)}
								stroke="var(--bg-card)"
								strokeWidth={2}
							/>
							<text
								x={p.x}
								y={p.y - 10}
								textAnchor="middle"
								className="text-[11px] font-medium"
								fill="var(--text-primary)"
							>
								{p.score}
							</text>
							<text
								x={p.x}
								y={PADDING_TOP + CHART_H + 20}
								textAnchor="middle"
								className="text-[11px]"
								fill="var(--text-muted)"
							>
								{String(p.hour).padStart(2, "0")}시
							</text>
						</g>
					))}
				</svg>
			</div>
		</div>
	);
}
