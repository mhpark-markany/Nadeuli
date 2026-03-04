import SunCalc from "suncalc";
import type { PrecipitationType, Sky } from "shared";

export function isNightTime(lat: number, lng: number, date = new Date()): boolean {
	const times = SunCalc.getTimes(date, lat, lng);
	return date < times.sunrise || date > times.sunset;
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
