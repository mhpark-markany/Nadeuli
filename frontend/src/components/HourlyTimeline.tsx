import { Clock } from "lucide-react";
import type { HourlyScore, PrecipitationType, Sky } from "shared";
import { gradeColor } from "../lib/colors";
import { getSunTimes } from "../lib/weather";

function weatherIcon(sky: Sky, pty: PrecipitationType): string {
	if (pty === "비" || pty === "비/눈") return "🌧️";
	if (pty === "눈") return "🌨️";
	if (sky === "흐림") return "☁️";
	if (sky === "구름많음") return "⛅";
	return "☀️";
}

const POINT_GAP = 64;
const PADDING_X = 24;
const PADDING_TOP = 40;
const CHART_H = 100;
const SVG_H = 210;

interface Props {
	hours: HourlyScore[];
	lat: number;
	lng: number;
}

export function HourlyTimeline({ hours, lat, lng }: Props) {
	if (hours.length === 0) return null;

	const svgW = PADDING_X * 2 + (hours.length - 1) * POINT_GAP;

	const points = hours.map((h, i) => ({
		x: PADDING_X + i * POINT_GAP,
		y: PADDING_TOP + CHART_H - (h.score / 100) * CHART_H,
		...h,
	}));

	const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

	const gradientPath = `${linePath} L${points[points.length - 1].x},${PADDING_TOP + CHART_H} L${points[0].x},${PADDING_TOP + CHART_H} Z`;

	// 날씨 변화 포인트 감지
	const weatherChanges = points.filter(
		(p, i) =>
			i > 0 &&
			(p.sky !== points[i - 1].sky || p.precipitationType !== points[i - 1].precipitationType),
	);

	// 일출/일몰 마커 계산
	const { sunrise, sunset } = getSunTimes(lat, lng);
	const sunriseHour = sunrise.getHours() + sunrise.getMinutes() / 60;
	const sunsetHour = sunset.getHours() + sunset.getMinutes() / 60;

	const firstHour = hours[0].hour;
	const lastHour = hours[hours.length - 1].hour;

	const getSunMarker = (sunHour: number, label: string, time: Date) => {
		// 내일 시간대(24+)에 해당하는 경우도 체크
		const h = sunHour >= firstHour && sunHour <= lastHour ? sunHour : sunHour + 24;
		if (h < firstHour || h > lastHour) return null;
		const x = PADDING_X + (h - firstHour) * POINT_GAP;
		const timeStr = time.toLocaleTimeString("ko-KR", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		return { x, label, timeStr };
	};

	const sunriseMarker = getSunMarker(sunriseHour, "🌅", sunrise);
	const sunsetMarker = getSunMarker(sunsetHour, "🌇", sunset);

	return (
		<div className="glass-card rounded-2xl p-5">
			<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
				<Clock className="h-4 w-4" />
				시간대별 전망
			</h3>
			<div className="overflow-x-auto select-none">
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
								{p.hour >= 24
									? `내일 ${String(p.hour - 24).padStart(2, "0")}시`
									: `${String(p.hour).padStart(2, "0")}시`}
							</text>
						</g>
					))}

					{/* 일출/일몰 마커 */}
					{sunriseMarker && (
						<g>
							<line
								x1={sunriseMarker.x}
								y1={PADDING_TOP}
								x2={sunriseMarker.x}
								y2={PADDING_TOP + CHART_H}
								stroke="var(--text-muted)"
								strokeWidth={1}
								strokeDasharray="4 2"
								opacity={0.5}
							/>
							<text
								x={sunriseMarker.x}
								y={PADDING_TOP + CHART_H + 38}
								textAnchor="middle"
								className="text-[10px]"
								fill="var(--text-muted)"
							>
								{sunriseMarker.label} {sunriseMarker.timeStr}
							</text>
						</g>
					)}
					{sunsetMarker && (
						<g>
							<line
								x1={sunsetMarker.x}
								y1={PADDING_TOP}
								x2={sunsetMarker.x}
								y2={PADDING_TOP + CHART_H}
								stroke="var(--text-muted)"
								strokeWidth={1}
								strokeDasharray="4 2"
								opacity={0.5}
							/>
							<text
								x={sunsetMarker.x}
								y={PADDING_TOP + CHART_H + 38}
								textAnchor="middle"
								className="text-[10px]"
								fill="var(--text-muted)"
							>
								{sunsetMarker.label} {sunsetMarker.timeStr}
							</text>
						</g>
					)}

					{/* 날씨 변화 마커 */}
					{weatherChanges.map((p) => (
						<text key={`wx-${p.hour}`} x={p.x} y={p.y - 24} textAnchor="middle" className="text-sm">
							{weatherIcon(p.sky, p.precipitationType)}
						</text>
					))}
				</svg>
			</div>
		</div>
	);
}
