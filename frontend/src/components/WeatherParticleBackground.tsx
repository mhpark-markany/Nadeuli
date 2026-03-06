import { initParticlesEngine, Particles } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useEffect, useMemo, useState } from "react";
import type { PrecipitationType, Sky } from "shared";
import type { TimeOfDay } from "../lib/weather";
import {
	getPrecipitationConfigs,
	getSkyConfig,
	getSkyOverlayOpacity,
} from "./weather-particles-config";

interface Palette {
	bg: string;
	orbs: [string, string, string];
}

const LIGHT_PALETTES: Record<TimeOfDay, Palette> = {
	dawn: {
		bg: "linear-gradient(180deg, #4A2C6A 0%, #C06070 30%, #F4A460 60%, #FFD4A8 100%)",
		orbs: ["#E8837C", "#F4A460", "#C084B0"],
	},
	day: {
		bg: "linear-gradient(180deg, #1E90FF 0%, #60B3F7 40%, #B0DEFF 80%, #E8F4FF 100%)",
		orbs: ["#FCD34D", "#60B3F7", "#A5E8FC"],
	},
	evening: {
		bg: "linear-gradient(180deg, #1B1040 0%, #6B2A6B 20%, #D4456A 45%, #F28C38 70%, #FCCB5E 100%)",
		orbs: ["#F28C38", "#D4456A", "#6B2A6B"],
	},
	night: {
		bg: "linear-gradient(180deg, #070B1A 0%, #0F1B3D 40%, #1A2755 70%, #243B6A 100%)",
		orbs: ["#1A2755", "#0F1B3D", "#2A3F7A"],
	},
};

const DARK_PALETTES: Record<TimeOfDay, Palette> = {
	dawn: {
		bg: "linear-gradient(180deg, #1E0F30 0%, #5A2838 30%, #6B3A28 60%, #3A2518 100%)",
		orbs: ["#6B3A38", "#6B3A28", "#5A3050"],
	},
	day: {
		bg: "linear-gradient(180deg, #0C1A30 0%, #1A3050 40%, #254060 80%, #1E3550 100%)",
		orbs: ["#8B7A20", "#1E3A58", "#2A4A68"],
	},
	evening: {
		bg: "linear-gradient(180deg, #0A0518 0%, #3A1238 20%, #5A1830 45%, #6A3818 70%, #3A2810 100%)",
		orbs: ["#6A3818", "#5A1830", "#3A1238"],
	},
	night: {
		bg: "linear-gradient(180deg, #040610 0%, #0A1028 40%, #0F1838 70%, #152245 100%)",
		orbs: ["#0F1838", "#0A1028", "#1A2850"],
	},
};

const ORB_PRESETS = [
	{ size: 60, x: 15, y: 20, delay: 0 },
	{ size: 45, x: 65, y: 60, delay: 2 },
	{ size: 35, x: 40, y: 80, delay: 4 },
];

interface Props {
	timeOfDay: TimeOfDay;
	sky: Sky;
	precipitationType: PrecipitationType;
	isDark: boolean;
}

export function WeatherParticleBackground({ timeOfDay, sky, precipitationType, isDark }: Props) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		initParticlesEngine(async (engine) => {
			await loadSlim(engine);
		}).then(() => setReady(true));
	}, []);

	const palette = (isDark ? DARK_PALETTES : LIGHT_PALETTES)[timeOfDay];
	const skyConfig = useMemo(() => getSkyConfig(sky, timeOfDay), [sky, timeOfDay]);
	const ptyConfigs = useMemo(() => getPrecipitationConfigs(precipitationType), [precipitationType]);
	const overlayOpacity = getSkyOverlayOpacity(sky);

	return (
		<div
			className="pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-all duration-1000"
			style={{ background: palette.bg }}
		>
			{/* 시간대 orb */}
			{palette.orbs.map((color, i) => (
				<div
					key={ORB_PRESETS[i].delay}
					className="absolute rounded-full opacity-30 animate-[float_8s_ease-in-out_infinite]"
					style={{
						width: `${ORB_PRESETS[i].size}vw`,
						height: `${ORB_PRESETS[i].size}vw`,
						left: `${ORB_PRESETS[i].x}%`,
						top: `${ORB_PRESETS[i].y}%`,
						background: `radial-gradient(circle, ${color}, transparent 70%)`,
						filter: "blur(40px)",
						animationDelay: `${ORB_PRESETS[i].delay}s`,
					}}
				/>
			))}
			{/* 흐림 오버레이 */}
			{overlayOpacity > 0 && (
				<div
					className="absolute inset-0 transition-opacity duration-1000"
					style={{ background: `rgba(120, 120, 130, ${overlayOpacity})` }}
				/>
			)}
			{/* 하늘 파티클 (별 or 구름) */}
			{ready && skyConfig && (
				<Particles id="sky-layer" options={skyConfig} className="absolute inset-0" />
			)}
			{/* 강수 파티클 (비 and/or 눈) */}
			{ready && ptyConfigs.map((cfg, i) => (
				<Particles key={`pty-${i}`} id={`pty-layer-${i}`} options={cfg} className="absolute inset-0" />
			))}
		</div>
	);
}
