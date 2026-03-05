import { useQuery } from "@tanstack/react-query";
import { fetchPlaces } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export function usePlaces(lat: number | null, lng: number | null) {
	return useQuery({
		queryKey: queryKeys.places(lat ?? 0, lng ?? 0),
		queryFn: () => fetchPlaces(lat ?? 0, lng ?? 0),
		enabled: lat != null && lng != null,
		staleTime: 30 * 60 * 1000,
	});
}
