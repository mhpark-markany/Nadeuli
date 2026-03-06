import { useEffect, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

function getSystemTheme(): Resolved {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeSystemTheme(cb: () => void) {
	const mq = window.matchMedia("(prefers-color-scheme: dark)");
	mq.addEventListener("change", cb);
	return () => mq.removeEventListener("change", cb);
}

function apply(resolved: Resolved) {
	const el = document.documentElement;
	el.style.colorScheme = resolved;
	el.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		const stored = localStorage.getItem("theme") as Theme | null;
		return stored ?? "system";
	});

	const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemTheme);
	const resolvedTheme: Resolved = theme === "system" ? systemTheme : theme;

	useEffect(() => {
		apply(resolvedTheme);
		localStorage.setItem("theme", theme);
	}, [theme, resolvedTheme]);

	const setTheme = (t: Theme) => setThemeState(t);

	return { theme, resolvedTheme, setTheme };
}
