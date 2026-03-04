import { useCallback, useEffect, useRef, useState } from "react";
import type { Place } from "shared";
import { fetchPlaces } from "../lib/api";
import { PlaceCard } from "./PlaceCard";

interface Props {
	lat: number;
	lng: number;
	initialPlaces: Place[];
}

export function PlaceSection({ lat, lng, initialPlaces }: Props) {
	const [places, setPlaces] = useState(initialPlaces);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const loaderRef = useRef<HTMLDivElement>(null);

	const loadMore = useCallback(async () => {
		if (loading || !hasMore) return;
		setLoading(true);
		try {
			const nextPage = page + 1;
			const newPlaces = await fetchPlaces(lat, lng, "all", nextPage);
			if (newPlaces.length === 0) {
				setHasMore(false);
			} else {
				setPlaces((prev) => [...prev, ...newPlaces]);
				setPage(nextPage);
			}
		} finally {
			setLoading(false);
		}
	}, [lat, lng, page, loading, hasMore]);

	useEffect(() => {
		const loader = loaderRef.current;
		if (!loader) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadMore();
				}
			},
			{ root: loader.parentElement, threshold: 0.1 },
		);

		observer.observe(loader);
		return () => observer.disconnect();
	}, [loadMore]);

	useEffect(() => {
		setPlaces(initialPlaces);
		setPage(1);
		setHasMore(true);
	}, [initialPlaces]);

	return (
		<div className="rounded-2xl bg-(--bg-card) p-5 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-(--text-secondary)">📍 추천 장소</h3>
			<div className="flex gap-3 overflow-x-auto pb-2">
				{places.map((p) => (
					<PlaceCard key={p.contentId} place={p} />
				))}
				{hasMore && (
					<div
						ref={loaderRef}
						className="flex min-w-[60px] shrink-0 items-center justify-center"
					>
						{loading && (
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-(--border-default) border-t-(--color-brand)" />
						)}
					</div>
				)}
			</div>
		</div>
	);
}
