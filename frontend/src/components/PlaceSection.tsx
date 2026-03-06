import { useInfiniteQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Place } from "shared";
import { fetchPlaces } from "../lib/api";
import { queryKeys } from "../lib/query-keys";
import { PlaceCard } from "./PlaceCard";
import { WeatherLoader } from "./WeatherLoader";

interface Props {
	lat: number;
	lng: number;
	initialPlaces: Place[];
}

export function PlaceSection({ lat, lng, initialPlaces }: Props) {
	const loaderRef = useRef<HTMLDivElement>(null);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
		queryKey: [...queryKeys.places(lat, lng), "infinite"],
		queryFn: ({ pageParam }) => fetchPlaces(lat, lng, "all", pageParam),
		initialPageParam: 1,
		initialData: { pages: [initialPlaces], pageParams: [1] },
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.length > 0 ? lastPageParam + 1 : undefined,
		staleTime: 30 * 60 * 1000,
	});

	const places = data?.pages.flat() ?? [];

	useEffect(() => {
		const loader = loaderRef.current;
		if (!loader) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ root: loader.parentElement, threshold: 0.1 },
		);

		observer.observe(loader);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	return (
		<div className="glass-card rounded-2xl p-4">
			<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
				<MapPin className="h-4 w-4" />
				추천 장소
			</h3>
			<div className="flex gap-3 overflow-x-auto pb-2">
				{places.map((p) => (
					<PlaceCard key={p.contentId} place={p} />
				))}
				{hasNextPage && (
					<div ref={loaderRef} className="flex min-w-[60px] shrink-0 items-center justify-center">
						{isFetchingNextPage && <WeatherLoader size={24} />}
					</div>
				)}
			</div>
		</div>
	);
}
