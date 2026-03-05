import { MapPin, MapPinOff } from "lucide-react";
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
import { WeatherLoader } from "./components/WeatherLoader";
import { WeeklyForecast } from "./components/WeeklyForecast";
import { useAuth } from "./hooks/useAuth";
import { useGeolocation } from "./hooks/useGeolocation";
import { useTheme } from "./hooks/useTheme";
import { fetchAddress, fetchDashboard, fetchFestivals, fetchPlaces } from "./lib/api";
import { selectTitles } from "./lib/naduri-titles";

const LOADING_TEXTS = [
	"구름 위에서 날씨 훔쳐보는 중 ☁️",
	"미세먼지한테 오늘 기분 물어보는 중 💨",
	"자외선 지수 몰래 엿보는 중 🕶️",
	"야외활동 점수 열심히 계산 중 🧮",
	"근처 숨은 명소 탐색 중 📍",
	"오늘 나들이 갈 수 있을지 고민 중 🤔",
	"하늘 상태 체크하는 중 🌤️",
	"바람 세기 측정하는 중 🌬️",
];

function shuffle<T>(arr: readonly T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

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
	const loadingTexts = useMemo(() => shuffle(LOADING_TEXTS), []);

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
					<LoginButton />
				</div>
			</header>

			{/* 로딩/에러 상태 */}
			{(geo.loading || loading) && (
				<div
					className="flex flex-col items-center justify-center py-20"
					style={{ animation: "fade-in-up 0.5s ease-out" }}
				>
					<WeatherLoader size={72} />
					<RotatingText
						texts={loadingTexts}
						className="mt-3 text-base text-(--text-muted)"
						rotationInterval={2000}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
						initial={{ y: "100%", opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: "-100%", opacity: 0 }}
					/>
				</div>
			)}

			{geo.error && (
				<div
					className="flex flex-col items-center justify-center py-16 text-center"
					style={{ animation: "fade-in-up 0.5s ease-out" }}
				>
					<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--bg-muted)">
						<MapPinOff className="h-7 w-7 text-(--text-muted)" />
					</div>
					<p className="text-sm font-medium text-(--text-primary)">위치 정보가 필요해요</p>
					<p className="mt-1 text-xs text-(--text-muted)">
						현재 위치를 기반으로 날씨와 추천 정보를 알려드려요
					</p>
					<p className="mt-3 rounded-lg bg-(--bg-muted) px-3 py-2 text-xs text-(--text-secondary)">
						브라우저 주소창 🔒 아이콘 → 위치 권한 허용
					</p>
					<button
						type="button"
						onClick={geo.retry}
						className="mt-4 cursor-pointer rounded-xl bg-(--color-brand) px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
					>
						위치 다시 요청
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
				<div className="stagger-in space-y-4">
					{/* 적합도 점수 */}
					<div className="rounded-2xl bg-(--bg-card) p-6 shadow-sm">
						<h2 className="mb-2 text-base font-medium text-(--text-secondary)">야외활동 적합도</h2>
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

					{/* 이번 주 전망 */}
					<WeeklyForecast days={data.weeklyForecast ?? []} />

					{/* 추천 장소 */}
					{places.length > 0 && geo.lat != null && geo.lng != null && (
						<PlaceSection lat={geo.lat} lng={geo.lng} initialPlaces={places} />
					)}

					{/* 주변 행사 */}
					{festivals.length > 0 && <FestivalSection festivals={festivals} />}
				</div>
			)}

			{/* 푸터 */}
			<footer className="mt-8 border-t border-(--border-default) pt-4 pb-6 text-center text-xs text-(--text-muted)">
				<div className="mb-3 flex items-center justify-center gap-2">
					<span>테마</span>
					<select
						value={theme}
						onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
						className="rounded-lg bg-(--bg-muted) px-2 py-1 text-(--text-secondary)"
					>
						<option value="system">시스템</option>
						<option value="light">라이트</option>
						<option value="dark">다크</option>
					</select>
				</div>
				<p>날씨 데이터: 기상청 | 대기질: 에어코리아 | 장소: 한국관광공사</p>
				<p className="mt-1">© 2026 나들이</p>
			</footer>
		</div>
	);
}
