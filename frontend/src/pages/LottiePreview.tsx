import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LOTTIE_FILES = [
	"Foggy.lottie",
	"Weather-cloudy(night).lottie",
	"Weather-mist.lottie",
	"Weather-night.lottie",
	"Weather-partly cloudy.lottie",
	"Weather-partly shower.lottie",
	"Weather-rainy(night).lottie",
	"Weather-snow sunny.lottie",
	"Weather-snow.lottie",
	"Weather-snow(night).lottie",
	"Weather-storm.lottie",
	"Weather-storm&showers(day).lottie",
	"Weather-sunny.lottie",
	"Weather-thunder.lottie",
	"Weather-windy.lottie",
];

export function LottiePreview() {
	return (
		<div className="min-h-screen bg-(--bg-base) p-8">
			<h1 className="mb-6 text-2xl font-bold text-(--text-primary)">Lottie Preview</h1>
			<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
				{LOTTIE_FILES.map((file) => (
					<div key={file} className="flex flex-col items-center gap-2 rounded-xl bg-(--bg-card) p-4">
						<DotLottieReact
							src={`/lottie/${file}`}
							loop
							autoplay
							style={{ width: 100, height: 100 }}
						/>
						<span className="text-center text-xs text-(--text-muted)">{file}</span>
					</div>
				))}
			</div>
		</div>
	);
}
