import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LottiePreview } from "./pages/LottiePreview";
import "./index.css";

const root = document.getElementById("root");
const isLottiePreview = window.location.search.includes("lottie");

if (root) {
	createRoot(root).render(
		<StrictMode>
			{isLottiePreview ? <LottiePreview /> : <App />}
		</StrictMode>,
	);
}
