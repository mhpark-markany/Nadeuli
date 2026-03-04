import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { KakaoCallback } from "./pages/KakaoCallback";
import { LottiePreview } from "./pages/LottiePreview";
import "./index.css";

const root = document.getElementById("root");
const path = window.location.pathname;
const isLottiePreview = window.location.search.includes("lottie");

function Router() {
	if (path === "/auth/kakao/callback") return <KakaoCallback />;
	if (isLottiePreview) return <LottiePreview />;
	return <App />;
}

if (root) {
	createRoot(root).render(
		<StrictMode>
			<Router />
		</StrictMode>,
	);
}
