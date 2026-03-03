import type { Weather } from "shared";

const SKY_EMOJI: Record<string, string> = {
	맑음: "☀️",
	구름많음: "⛅",
	흐림: "☁️",
};

const WBGT_COLOR: Record<string, string> = {
	안전: "text-green-600",
	주의: "text-yellow-600",
	경계: "text-orange-500",
	위험: "text-red-500",
	매우위험: "text-red-700",
};

export function WeatherCard({ data }: { data: Weather }) {
	return (
		<div className="rounded-2xl bg-white p-5 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-slate-500">날씨</h3>
			<div className="mb-3 flex items-baseline gap-2">
				<span className="text-3xl">{SKY_EMOJI[data.sky] ?? "🌤️"}</span>
				<span className="text-2xl font-bold">{data.temperature}°C</span>
				{data.precipitationType !== "없음" && (
					<span className="text-sm text-blue-500">🌧️ {data.precipitationType}</span>
				)}
			</div>
			<dl className="grid grid-cols-2 gap-y-1 text-sm">
				<div className="flex justify-between">
					<dt className="text-slate-400">체감온도</dt>
					<dd className="font-medium">{data.feelsLike}°C</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-slate-400">습도</dt>
					<dd className="font-medium">{data.humidity}%</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-slate-400">풍속</dt>
					<dd className="font-medium">{data.windSpeed}m/s</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-slate-400">WBGT</dt>
					<dd className={`font-medium ${WBGT_COLOR[data.wbgtGrade] ?? ""}`}>
						{data.wbgt} ({data.wbgtGrade})
					</dd>
				</div>
			</dl>
		</div>
	);
}
