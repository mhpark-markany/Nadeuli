import { useState } from "react";
import type { PrecipitationType, Sky } from "shared";
import { WeatherParticleBackground } from "../components/WeatherParticleBackground";
import { useTheme } from "../hooks/useTheme";
import type { TimeOfDay } from "../lib/weather";

const SKIES: Sky[] = ["맑음", "구름많음", "흐림"];
const PTYPES: PrecipitationType[] = ["없음", "비", "비/눈", "눈"];
const TIMES: { value: TimeOfDay; label: string }[] = [
	{ value: "dawn", label: "🌅 새벽" },
	{ value: "day", label: "☀️ 낮" },
	{ value: "evening", label: "🌇 저녁" },
	{ value: "night", label: "🌙 밤" },
];

export function WeatherPreview() {
	const [sky, setSky] = useState<Sky>("맑음");
	const [pty, setPty] = useState<PrecipitationType>("없음");
	const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
	const { resolvedTheme } = useTheme();

	return (
		<>
			<WeatherParticleBackground
				timeOfDay={timeOfDay}
				sky={sky}
				precipitationType={pty}
				isDark={resolvedTheme === "dark"}
			/>

			<div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
				<h1 className="text-xl font-bold text-white">날씨 배경 프리뷰</h1>

				<div className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-black/40 p-5 backdrop-blur-xl">
					<Control
						label="시간"
						options={TIMES.map((t) => t.value)}
						labels={TIMES.map((t) => t.label)}
						value={timeOfDay}
						onChange={setTimeOfDay}
					/>
					<Control label="하늘" options={SKIES} value={sky} onChange={setSky} />
					<Control label="강수" options={PTYPES} value={pty} onChange={setPty} />
				</div>

				<div className="glass-theme flex flex-col gap-4">
					<div className="glass-card rounded-2xl p-4">
						<p className="text-sm font-medium text-(--text-primary)">글래스 카드 샘플</p>
						<p className="mt-1 text-xs text-(--text-muted)">
							backdrop-blur + 파티클 배경이 비치는 모습을 확인하세요
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="glass-card rounded-2xl p-4">
							<p className="text-2xl font-bold text-(--text-primary)">24°</p>
							<p className="text-xs text-(--text-muted)">체감 22°</p>
						</div>
						<div className="glass-card rounded-2xl p-4">
							<p className="text-2xl font-bold text-(--text-primary)">좋음</p>
							<p className="text-xs text-(--text-muted)">미세먼지</p>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

function Control<T extends string>({
	label,
	options,
	labels,
	value,
	onChange,
}: {
	label: string;
	options: T[];
	labels?: string[];
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="w-10 shrink-0 text-xs text-white/60">{label}</span>
			{options.map((opt, i) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(opt)}
					className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${value === opt ? "bg-white/25 font-semibold text-white" : "text-white/60 hover:bg-white/10"}`}
				>
					{labels?.[i] ?? opt}
				</button>
			))}
		</div>
	);
}
