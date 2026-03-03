import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
	document.documentElement.style.colorScheme = theme === "system" ? "" : theme;
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		const stored = localStorage.getItem("theme") as Theme | null;
		return stored ?? "system";
	});

	useEffect(() => {
		applyTheme(theme);
		localStorage.setItem("theme", theme);
	}, [theme]);

	const setTheme = (t: Theme) => setThemeState(t);

	const toggle = () => {
		const current = theme === "system" ? getSystemTheme() : theme;
		setThemeState(current === "dark" ? "light" : "dark");
	};

	return { theme, setTheme, toggle };
}
