import { useQuery } from "@tanstack/react-query";
import { fetchFestivals } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export function useFestivals(lat: number | null, lng: number | null) {
	return useQuery({
		queryKey: queryKeys.festivals(lat ?? 0, lng ?? 0),
		queryFn: () => fetchFestivals(lat ?? 0, lng ?? 0),
		enabled: lat != null && lng != null,
		staleTime: 60 * 60 * 1000,
	});
}
