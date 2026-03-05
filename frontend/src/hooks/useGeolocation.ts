import { useCallback, useEffect, useState } from "react";

interface GeoState {
	lat: number | null;
	lng: number | null;
	error: string | null;
	loading: boolean;
}

export function useGeolocation(): GeoState & { retry: () => void } {
	const [state, setState] = useState<GeoState>({
		lat: null,
		lng: null,
		error: null,
		loading: true,
	});

	const locate = useCallback((retries = 2) => {
		if (!navigator.geolocation) {
			setState({ lat: null, lng: null, error: "Geolocation 미지원", loading: false });
			return;
		}
		setState((prev) => ({ ...prev, loading: true, error: null }));
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setState({
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
					error: null,
					loading: false,
				});
			},
			(err) => {
				// PERMISSION_DENIED(1)이 아니고 재시도 횟수가 남았으면 재시도
				if (err.code !== 1 && retries > 0) {
					locate(retries - 1);
					return;
				}
				setState({
					lat: null,
					lng: null,
					error: err.message,
					loading: false,
				});
			},
			{ enableHighAccuracy: false, timeout: 10000, maximumAge: 300_000 },
		);
	}, []);

	useEffect(() => {
		locate();

		const onVisible = () => {
			if (document.visibilityState === "visible") locate();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [locate]);

	return { ...state, retry: locate };
}
