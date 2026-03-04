import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardData, Festival, Place } from "shared";
import RotatingText from "../shared/components/RotatingText";
import { AirQualityCard } from "./components/AirQualityCard";
import { ChatPanel } from "./components/ChatPanel";
import { FestivalSection } from "./components/FestivalSection";
import { HourlyTimeline } from "./components/HourlyTimeline";
import { LoginButton } from "./components/LoginButton";
import { PlaceSection } from "./components/PlaceSection";
import { ScoreRing } from "./components/ScoreRing";
import { WeatherCard } from "./components/WeatherCard";
import { useAuth } from "./hooks/useAuth";
import { useGeolocation } from "./hooks/useGeolocation";
import { useTheme } from "./hooks/useTheme";
import { fetchAddress, fetchDashboard, fetchFestivals, fetchPlaces } from "./lib/api";
import { selectTitles } from "./lib/naduri-titles";

export function App() {
	const geo = useGeolocation();
	const { theme, setTheme } = useTheme();
	const { user } = useAuth();
	const [data, setData] = useState<DashboardData | null>(null);
	const [places, setPlaces] = useState<Place[]>([]);
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [address, setAddress] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async (lat: number, lng: number) => {
		setLoading(true);
		setError(null);
		try {
			const [dashboard, placesData, festivalsData, addressData] = await Promise.all([
				fetchDashboard(lat, lng),
				fetchPlaces(lat, lng).catch(() => [] as Place[]),
				fetchFestivals(lat, lng).catch(() => [] as Festival[]),
				fetchAddress(lat, lng).catch(() => null),
			]);
			setData(dashboard);
			setPlaces(placesData);
			setFestivals(festivalsData);
			setAddress(addressData?.dong ?? addressData?.sigungu ?? null);
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

	const titles = useMemo(
		() => selectTitles(data?.weather, data?.airQuality),
		[data?.weather, data?.airQuality],
	);

	return (
		<div className="mx-auto max-w-lg px-4 py-6">
			{/* 헤더 */}
			<header className="mb-6 flex items-center justify-between">
				<h1 className="flex items-center gap-2 text-xl font-bold">
					<RotatingText
						texts={titles}
						mainClassName="px-2 bg-(--color-brand) text-white overflow-hidden py-0.5 rounded-lg"
						staggerFrom="last"
						initial={{ y: "100%" }}
						animate={{ y: 0 }}
						exit={{ y: "-120%" }}
						staggerDuration={0.025}
						splitLevelClassName="overflow-hidden pb-0.5"
						transition={{ type: "spring", damping: 30, stiffness: 400 }}
						rotationInterval={3000}
					/>
					나들이
				</h1>
				<div className="flex items-center gap-3">
					{address && (
						<span className="flex items-center gap-1 text-sm text-(--text-muted)">
							<MapPin className="h-4 w-4" />
							{address}
						</span>
					)}
					<select
						value={theme}
						onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
						className="rounded-lg bg-(--bg-muted) px-2 py-1 text-sm text-(--text-secondary)"
					>
						<option value="system">시스템</option>
						<option value="light">라이트</option>
						<option value="dark">다크</option>
					</select>
					<LoginButton />
				</div>
			</header>

			{/* 로딩/에러 상태 */}
			{(geo.loading || loading) && (
				<div className="flex items-center justify-center py-20">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-(--border-default) border-t-(--color-brand)" />
				</div>
			)}

			{geo.error && (
				<div className="rounded-xl bg-red-500/10 p-4 text-center text-sm text-(--color-error)">
					<p>위치 정보를 가져올 수 없습니다</p>
					<p className="mt-1 text-xs opacity-70">{geo.error}</p>
					<button
						type="button"
						onClick={geo.retry}
						className="mt-2 cursor-pointer rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium transition-opacity hover:opacity-70"
					>
						다시 시도
					</button>
				</div>
			)}

			{error && !geo.error && (
				<div className="rounded-xl bg-yellow-500/10 p-4 text-center text-sm text-(--color-warning)">
					{error}
				</div>
			)}

			{/* 대시보드 */}
			{data && !loading && (
				<div className="space-y-4">
					{/* 적합도 점수 */}
					<div className="rounded-2xl bg-(--bg-card) p-6 shadow-sm">
						<h2 className="mb-4 text-center text-sm font-medium text-(--text-secondary)">
							야외활동 적합도
						</h2>
						<ScoreRing score={data.score} />
					</div>

					{/* 대기질 + 날씨 */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<AirQualityCard data={data.airQuality} />
						<WeatherCard data={data.weather} lat={geo.lat ?? 0} lng={geo.lng ?? 0} />
					</div>

					{/* AI 채팅 */}
					{geo.lat != null && geo.lng != null && (
						<ChatPanel lat={geo.lat} lng={geo.lng} userId={user?.id} />
					)}

					{/* 시간대별 전망 */}
					<HourlyTimeline hours={data.score.hourlyForecast} lat={geo.lat ?? 0} lng={geo.lng ?? 0} />

					{/* 추천 장소 */}
					{places.length > 0 && geo.lat != null && geo.lng != null && (
						<PlaceSection lat={geo.lat} lng={geo.lng} initialPlaces={places} />
					)}

					{/* 주변 행사 */}
					{festivals.length > 0 && <FestivalSection festivals={festivals} />}
				</div>
			)}
		</div>
	);
}
