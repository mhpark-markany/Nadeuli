import { useCallback, useEffect, useState } from "react";
import type { DashboardData, Festival, Place } from "shared";
import { AirQualityCard } from "./components/AirQualityCard";
import { ChatPanel } from "./components/ChatPanel";
import { FestivalCard } from "./components/FestivalCard";
import { HourlyTimeline } from "./components/HourlyTimeline";
import { PlaceCard } from "./components/PlaceCard";
import { ScoreRing } from "./components/ScoreRing";
import { WeatherCard } from "./components/WeatherCard";
import { useGeolocation } from "./hooks/useGeolocation";
import { fetchDashboard, fetchFestivals, fetchPlaces } from "./lib/api";

export function App() {
	const geo = useGeolocation();
	const [data, setData] = useState<DashboardData | null>(null);
	const [places, setPlaces] = useState<Place[]>([]);
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async (lat: number, lng: number) => {
		setLoading(true);
		setError(null);
		try {
			const [dashboard, placesData, festivalsData] = await Promise.all([
				fetchDashboard(lat, lng),
				fetchPlaces(lat, lng).catch(() => [] as Place[]),
				fetchFestivals().catch(() => [] as Festival[]),
			]);
			setData(dashboard);
			setPlaces(placesData);
			setFestivals(festivalsData);
		} catch (e) {
			setError(e instanceof Error ? e.message : "데이터 로드 실패");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (geo.lat != null && geo.lng != null) {
			load(geo.lat, geo.lng);
		}
	}, [geo.lat, geo.lng, load]);

	return (
		<div className="mx-auto max-w-lg px-4 py-6">
			{/* 헤더 */}
			<header className="mb-6 flex items-center justify-between">
				<h1 className="text-xl font-bold">🌤️ 나들이</h1>
				{geo.lat != null && (
					<span className="text-sm text-slate-400">
						📍 {geo.lat.toFixed(2)}, {geo.lng?.toFixed(2)}
					</span>
				)}
			</header>

			{/* 로딩/에러 상태 */}
			{(geo.loading || loading) && (
				<div className="flex items-center justify-center py-20">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
				</div>
			)}

			{geo.error && (
				<div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600">
					<p>위치 정보를 가져올 수 없습니다</p>
					<p className="mt-1 text-xs text-red-400">{geo.error}</p>
					<button
						type="button"
						onClick={geo.retry}
						className="mt-2 rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
					>
						다시 시도
					</button>
				</div>
			)}

			{error && !geo.error && (
				<div className="rounded-xl bg-yellow-50 p-4 text-center text-sm text-yellow-700">
					{error}
				</div>
			)}

			{/* 대시보드 */}
			{data && !loading && (
				<div className="space-y-4">
					{/* 적합도 점수 */}
					<div className="rounded-2xl bg-white p-6 shadow-sm">
						<h2 className="mb-4 text-center text-sm font-medium text-slate-500">야외활동 적합도</h2>
						<ScoreRing score={data.score} />
					</div>

					{/* 대기질 + 날씨 */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<AirQualityCard data={data.airQuality} />
						<WeatherCard data={data.weather} />
					</div>

					{/* 시간대별 전망 */}
					<HourlyTimeline hours={data.score.hourlyForecast} />

					{/* 추천 장소 */}
					{places.length > 0 && (
						<div className="rounded-2xl bg-white p-5 shadow-sm">
							<h3 className="mb-3 text-sm font-medium text-slate-500">📍 추천 장소</h3>
							<div className="flex gap-3 overflow-x-auto pb-2">
								{places.slice(0, 6).map((p) => (
									<PlaceCard key={p.contentId} place={p} />
								))}
							</div>
						</div>
					)}

					{/* 주변 행사 */}
					{festivals.length > 0 && (
						<div className="rounded-2xl bg-white p-5 shadow-sm">
							<h3 className="mb-3 text-sm font-medium text-slate-500">🎪 주변 행사</h3>
							<div className="space-y-2">
								{festivals.slice(0, 4).map((f) => (
									<FestivalCard key={f.id} festival={f} />
								))}
							</div>
						</div>
					)}

					{/* AI 채팅 */}
					{geo.lat != null && geo.lng != null && <ChatPanel lat={geo.lat} lng={geo.lng} />}
				</div>
			)}
		</div>
	);
}
