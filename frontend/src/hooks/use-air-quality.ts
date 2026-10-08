import { useQuery } from "@tanstack/react-query";
import { fetchAirQuality } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export function useAirQuality(lat: number | null, lng: number | null) {
	return useQuery({
		queryKey: queryKeys.airQuality(lat ?? 0, lng ?? 0),
		queryFn: () => fetchAirQuality(lat ?? 0, lng ?? 0),
		enabled: lat != null && lng != null,
	});
}
