import { useQuery } from "@tanstack/react-query";
import { fetchAddress } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export function useAddress(lat: number | null, lng: number | null) {
	return useQuery({
		queryKey: queryKeys.address(lat ?? 0, lng ?? 0),
		queryFn: () => fetchAddress(lat ?? 0, lng ?? 0),
		enabled: lat != null && lng != null,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 24 * 60 * 60 * 1000,
	});
}
