import type { PrecipitationType, Sky } from "shared";
import SunCalc from "suncalc";

export function getSunTimes(lat: number, lng: number, date = new Date()) {
	const times = SunCalc.getTimes(date, lat, lng);
	return { sunrise: times.sunrise, sunset: times.sunset };
}

export type TimeOfDay = "dawn" | "day" | "evening" | "night";

export function getTimeOfDay(lat: number, lng: number, date = new Date()): TimeOfDay {
	const times = SunCalc.getTimes(date, lat, lng);
	const t = date.getTime();
	const sunrise = times.sunrise.getTime();
	const sunset = times.sunset.getTime();
	const hour = 60 * 60 * 1000;

	if (t >= sunrise - hour && t < sunrise + hour) return "dawn";
	if (t >= sunset - hour && t < sunset + hour) return "evening";
	if (t >= sunrise + hour && t < sunset - hour) return "day";
	return "night";
}

export function isNightTime(lat: number, lng: number, date = new Date()): boolean {
	const { sunrise, sunset } = getSunTimes(lat, lng, date);
	return date < sunrise || date > sunset;
}

export function getWeatherLottie(
	sky: Sky,
	precipitationType: PrecipitationType,
	isNight: boolean,
): string {
	// 강수 우선
	if (precipitationType === "눈") {
		return isNight ? "Weather-snow(night).lottie" : "Weather-snow.lottie";
	}
	if (precipitationType === "비/눈") {
		return isNight ? "Weather-snow(night).lottie" : "Weather-snow sunny.lottie";
	}
	if (precipitationType === "비") {
		return isNight ? "Weather-rainy(night).lottie" : "Weather-partly shower.lottie";
	}

	// 하늘 상태
	if (sky === "맑음") {
		return isNight ? "Weather-night.lottie" : "Weather-sunny.lottie";
	}
	if (sky === "구름많음") {
		return isNight ? "Weather-cloudy(night).lottie" : "Weather-partly cloudy.lottie";
	}
	// 흐림
	return isNight ? "Weather-cloudy(night).lottie" : "Weather-windy.lottie";
}
