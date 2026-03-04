import { Cloud, CloudRain, CloudSun, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Weather } from "shared";

const SKY_ICON: Record<string, LucideIcon> = {
	맑음: Sun,
	구름많음: CloudSun,
	흐림: Cloud,
};

const WBGT_COLOR: Record<string, string> = {
	안전: "text-(--color-success)",
	주의: "text-(--color-warning)",
	경계: "text-orange-500",
	위험: "text-(--color-error)",
	매우위험: "text-red-700",
};

export function WeatherCard({ data }: { data: Weather }) {
	const SkyIcon = SKY_ICON[data.sky] ?? CloudSun;

	return (
		<div className="rounded-2xl bg-(--bg-card) p-5 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-(--text-secondary)">날씨</h3>
			<div className="mb-3 flex items-baseline gap-2">
				<SkyIcon className="h-8 w-8 text-(--color-brand)" />
				<span className="text-2xl font-bold">{data.temperature}°C</span>
				{data.precipitationType !== "없음" && (
					<span className="flex items-center gap-1 text-sm text-(--color-info)">
						<CloudRain className="h-4 w-4" />
						{data.precipitationType}
					</span>
				)}
			</div>
			<dl className="grid grid-cols-2 gap-y-1 text-sm">
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">체감온도</dt>
					<dd className="font-medium">{data.feelsLike}°C</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">습도</dt>
					<dd className="font-medium">{data.humidity}%</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">풍속</dt>
					<dd className="font-medium">{data.windSpeed}m/s</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">WBGT</dt>
					<dd className={`font-medium ${WBGT_COLOR[data.wbgtGrade] ?? ""}`}>
						{data.wbgt} ({data.wbgtGrade})
					</dd>
				</div>
			</dl>
		</div>
	);
}
