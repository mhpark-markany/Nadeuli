import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { CloudRain, Sun } from "lucide-react";
import type { Weather } from "shared";
import { getWeatherLottie, isNightTime } from "../lib/weather";

const WBGT_COLOR: Record<string, string> = {
	안전: "text-(--color-success)",
	주의: "text-(--color-warning)",
	경계: "text-orange-400",
	위험: "text-(--color-error)",
	매우위험: "text-(--color-error)",
};

interface WeatherCardProps {
	data: Weather;
	lat: number;
	lng: number;
}

export function WeatherCard({ data, lat, lng }: WeatherCardProps) {
	const isNight = isNightTime(lat, lng);
	const lottieFile = getWeatherLottie(data.sky, data.precipitationType, isNight);

	return (
		<div className="glass-card relative overflow-hidden rounded-2xl p-4">
			{/* 배경 Lottie */}
			<div className="pointer-events-none absolute -right-4 -top-4 opacity-30">
				<DotLottieReact
					src={`/lottie/${lottieFile}`}
					loop
					autoplay
					style={{ width: 130, height: 130 }}
				/>
			</div>
			<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
				<Sun className="h-4 w-4" />
				날씨
			</h3>
			<div className="mb-3 flex items-center justify-between">
				<span className="text-2xl font-bold">{data.temperature}℃</span>
				{data.precipitationType !== "없음" && (
					<span className="flex items-center gap-1 text-sm text-(--color-info)">
						<CloudRain className="h-4 w-4" />
						{data.precipitationType}
					</span>
				)}
			</div>
			<dl className="space-y-1 text-sm">
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">체감온도</dt>
					<dd className="font-medium">{data.feelsLike}℃</dd>
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
					<dt className="text-(--text-muted)">WBGT(더위지수)</dt>
					<dd className={`font-medium ${WBGT_COLOR[data.wbgtGrade] ?? ""}`}>
						{data.wbgt} ({data.wbgtGrade})
					</dd>
				</div>
			</dl>
		</div>
	);
}
