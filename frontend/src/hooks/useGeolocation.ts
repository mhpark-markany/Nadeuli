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

	const locate = useCallback(() => {
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
				setState({
					lat: null,
					lng: null,
					error: err.message,
					loading: false,
				});
			},
			{ enableHighAccuracy: false, timeout: 10000 },
		);
	}, []);

	useEffect(() => {
		locate();
	}, [locate]);

	return { ...state, retry: locate };
}
