import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../lib/api";
import { queryKeys } from "../lib/query-keys";

export function useDashboard(lat: number | null, lng: number | null) {
	return useQuery({
		queryKey: queryKeys.dashboard(lat ?? 0, lng ?? 0),
		queryFn: () => fetchDashboard(lat ?? 0, lng ?? 0),
		enabled: lat != null && lng != null,
	});
}
