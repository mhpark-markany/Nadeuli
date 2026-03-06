import { PartyPopper } from "lucide-react";
import { useState } from "react";
import type { Festival } from "shared";
import { FestivalCard } from "./FestivalCard";

const INITIAL_COUNT = 4;

export function FestivalSection({ festivals }: { festivals: Festival[] }) {
	const [expanded, setExpanded] = useState(false);
	const displayCount = expanded ? festivals.length : INITIAL_COUNT;
	const hasMore = festivals.length > INITIAL_COUNT;

	return (
		<div className="glass-card rounded-2xl p-4">
			<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
				<PartyPopper className="h-4 w-4" />
				주변 행사
			</h3>
			<div className="space-y-2">
				{festivals.slice(0, displayCount).map((f) => (
					<FestivalCard key={f.id} festival={f} />
				))}
			</div>
			{hasMore && (
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="mt-3 w-full cursor-pointer rounded-lg bg-(--bg-muted) py-2 text-sm text-(--text-secondary) transition-opacity hover:opacity-70"
				>
					{expanded ? "접기" : `더보기 (${festivals.length - INITIAL_COUNT}개)`}
				</button>
			)}
		</div>
	);
}
