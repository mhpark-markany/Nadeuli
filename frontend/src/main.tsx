import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { queryClient } from "./lib/query-client";
import { KakaoCallback } from "./pages/KakaoCallback";
import { LottiePreview } from "./pages/LottiePreview";
import { WeatherPreview } from "./pages/WeatherPreview";
import "./index.css";

const root = document.getElementById("root");
const path = window.location.pathname;
const search = window.location.search;

function Router() {
	if (path === "/auth/kakao/callback") return <KakaoCallback />;
	if (search.includes("lottie")) return <LottiePreview />;
	if (search.includes("weather-preview")) return <WeatherPreview />;
	return <App />;
}

if (root) {
	createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<Router />
			</QueryClientProvider>
		</StrictMode>,
	);
}
