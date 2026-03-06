import type { ISourceOptions } from "@tsparticles/engine";
import type { PrecipitationType, Sky } from "shared";
import type { TimeOfDay } from "../lib/weather";

const base = {
	fpsLimit: 60,
	detectRetina: true,
	interactivity: { events: {} },
} satisfies ISourceOptions;

// ── 하늘 레이어: 맑음(밤→별), 구름많음/흐림→구름 파티클 ──

export function getSkyConfig(sky: Sky, timeOfDay: TimeOfDay): ISourceOptions | null {
	if (sky === "맑음") {
		if (timeOfDay === "night") return STARS;
		return null;
	}
	return sky === "흐림" ? CLOUDS_HEAVY : CLOUDS_LIGHT;
}

export function getSkyOverlayOpacity(sky: Sky): number {
	if (sky === "흐림") return 0.35;
	if (sky === "구름많음") return 0.15;
	return 0;
}

// ── 강수 레이어: 비/눈 독립 ──

export function getPrecipitationConfigs(pty: PrecipitationType): ISourceOptions[] {
	if (pty === "비") return [RAIN];
	if (pty === "눈") return [SNOW];
	if (pty === "비/눈") return [RAIN, SNOW];
	return [];
}

// ── 파티클 프리셋 ──

const STARS: ISourceOptions = {
	...base,
	particles: {
		number: { value: 60, density: { enable: true } },
		color: { value: "#FFFFFF" },
		shape: { type: "circle" },
		opacity: {
			value: { min: 0.05, max: 0.5 },
			animation: { enable: true, speed: 0.8, sync: false, startValue: "random" },
		},
		size: { value: { min: 0.5, max: 2.5 } },
		move: { enable: true, speed: 0.1, direction: "none", outModes: "bounce", random: true },
	},
};

const CLOUDS_LIGHT: ISourceOptions = {
	...base,
	particles: {
		number: { value: 8, density: { enable: true } },
		color: { value: "#FFFFFF" },
		shape: { type: "circle" },
		opacity: { value: { min: 0.06, max: 0.18 } },
		size: { value: { min: 40, max: 70 } },
		move: { enable: true, speed: 0.3, direction: "right", outModes: "out", straight: true },
	},
};

const CLOUDS_HEAVY: ISourceOptions = {
	...base,
	particles: {
		number: { value: 14, density: { enable: true } },
		color: { value: "#FFFFFF" },
		shape: { type: "circle" },
		opacity: { value: { min: 0.1, max: 0.3 } },
		size: { value: { min: 50, max: 90 } },
		move: { enable: true, speed: 0.25, direction: "right", outModes: "out", straight: true },
	},
};

const RAIN: ISourceOptions = {
	...base,
	particles: {
		number: { value: 150, density: { enable: true } },
		color: { value: ["#94A3B8", "#B0C4DE", "#CBD5E1"] },
		shape: { type: "circle" },
		opacity: { value: { min: 0.3, max: 0.6 } },
		size: { value: { min: 1, max: 2.5 } },
		move: {
			enable: true,
			speed: { min: 20, max: 35 },
			direction: "bottom",
			outModes: "out",
			straight: true,
		},
	},
};

const SNOW: ISourceOptions = {
	...base,
	particles: {
		number: { value: 50, density: { enable: true } },
		color: { value: "#FFFFFF" },
		shape: { type: "circle" },
		opacity: { value: { min: 0.2, max: 0.5 } },
		size: { value: { min: 2, max: 6 } },
		move: {
			enable: true,
			speed: { min: 0.5, max: 2 },
			direction: "bottom",
			outModes: "out",
			straight: false,
			random: true,
		},
	},
};
