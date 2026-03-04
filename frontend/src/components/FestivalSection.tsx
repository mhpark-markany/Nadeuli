import { useState } from "react";
import type { Festival } from "shared";
import { FestivalCard } from "./FestivalCard";

const INITIAL_COUNT = 4;

export function FestivalSection({ festivals }: { festivals: Festival[] }) {
	const [expanded, setExpanded] = useState(false);
	const displayCount = expanded ? festivals.length : INITIAL_COUNT;
	const hasMore = festivals.length > INITIAL_COUNT;

	return (
		<div className="rounded-2xl bg-(--bg-card) p-5 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-(--text-secondary)">🎪 주변 행사</h3>
			<div
				className={
					expanded ? "max-h-80 space-y-2 overflow-y-auto scrollbar-gutter-stable" : "space-y-2"
				}
			>
				{festivals.slice(0, displayCount).map((f) => (
					<FestivalCard key={f.id} festival={f} />
				))}
			</div>
			{hasMore && (
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="mt-3 w-full rounded-lg bg-(--bg-muted) py-2 text-sm text-(--text-secondary)"
				>
					{expanded ? "접기" : `더보기 (${festivals.length - INITIAL_COUNT}개)`}
				</button>
			)}
		</div>
	);
}
