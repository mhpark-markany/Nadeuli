import { useQuery } from "@tanstack/react-query";
import { fetchScore } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export function useScore(lat: number | null, lng: number | null) {
	return useQuery({
		queryKey: queryKeys.score(lat ?? 0, lng ?? 0),
		queryFn: () => fetchScore(lat ?? 0, lng ?? 0),
		enabled: lat != null && lng != null,
	});
}
