import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useMemo } from "react";

const LOADER_LOTTIES = [
	"Weather-sunny.lottie",
	"Weather-partly cloudy.lottie",
	"Weather-windy.lottie",
];

export function WeatherLoader({ size = 28 }: { size?: number }) {
	const file = useMemo(() => LOADER_LOTTIES[Math.floor(Math.random() * LOADER_LOTTIES.length)], []);

	return (
		<DotLottieReact src={`/lottie/${file}`} loop autoplay style={{ width: size, height: size }} />
	);
}
