import { CalendarDays, Droplets } from "lucide-react";
import type { DailyForecast, PrecipitationType, Sky } from "shared";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function weatherEmoji(sky: Sky, pty: PrecipitationType): React.ReactNode {
	if (pty === "비" || pty === "비/눈") return <span className="text-base">🌧️</span>;
	if (pty === "눈") return <span className="text-base">🌨️</span>;
	if (sky === "흐림") return <span className="text-base">☁️</span>;
	if (sky === "구름많음") return <span className="text-base">⛅</span>;
	return <span className="text-base">☀️</span>;
}

function parseDate(dateStr: string): Date {
	const y = Number(dateStr.slice(0, 4));
	const m = Number(dateStr.slice(4, 6)) - 1;
	const d = Number(dateStr.slice(6, 8));
	return new Date(y, m, d);
}

function formatDay(dateStr: string, index: number): { label: string; sub: string } {
	const d = parseDate(dateStr);
	const sub = `${d.getMonth() + 1}/${d.getDate()}`;
	if (index === 0) return { label: "오늘", sub };
	if (index === 1) return { label: "내일", sub };
	return { label: DAY_NAMES[d.getDay()], sub };
}

interface Props {
	days: DailyForecast[];
}

export function WeeklyForecast({ days }: Props) {
	if (days.length === 0) return null;

	return (
		<div className="glass-card rounded-2xl p-4">
			<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
				<CalendarDays className="h-4 w-4" />
				7일간 전망
			</h3>
			<div className="flex flex-col gap-2">
				{days.map((day, i) => {
					const { label, sub } = formatDay(day.date, i);
					return (
						<div
							key={day.date}
							className="flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-(--bg-muted)"
						>
							{/* 요일 */}
							<div className="w-8 shrink-0 text-center">
								<span className="text-sm font-medium text-(--text-primary)">{label}</span>
								{sub && <span className="block text-[10px] text-(--text-muted)">{sub}</span>}
							</div>

							{/* 날씨 아이콘 */}
							<div className="flex w-6 shrink-0 justify-center">
								{weatherEmoji(day.sky, day.precipitationType)}
							</div>

							{/* 강수확률 */}
							<div className="w-10 shrink-0 text-center">
								{day.pop > 0 ? (
									<span className="flex items-center justify-center gap-0.5 text-xs text-(--color-info)">
										<Droplets className="h-3 w-3" />
										{day.pop}%
									</span>
								) : (
									<span className="text-xs text-(--text-muted)">—</span>
								)}
							</div>

							{/* 기온 바 */}
							<div className="flex flex-1 items-center gap-1.5">
								<span className="w-7 text-right text-xs text-(--color-info)">{day.minTemp}°</span>
								<div className="relative h-2 flex-1 overflow-hidden rounded-full bg-(--bg-muted)">
									<TempBar min={day.minTemp} max={day.maxTemp} rangeMin={days} />
								</div>
								<span className="w-7 text-xs text-orange-300">{day.maxTemp}°</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function TempBar({
	min,
	max,
	rangeMin: days,
}: {
	min: number;
	max: number;
	rangeMin: DailyForecast[];
}) {
	const allMin = Math.min(...days.map((d) => d.minTemp));
	const allMax = Math.max(...days.map((d) => d.maxTemp));
	const range = allMax - allMin || 1;
	const left = ((min - allMin) / range) * 100;
	const width = ((max - min) / range) * 100;

	return (
		<div
			className="absolute top-0 h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
			style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
		/>
	);
}
