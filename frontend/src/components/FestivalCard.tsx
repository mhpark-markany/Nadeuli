import type { Festival } from "shared";

function formatDate(dateStr: string): string {
	if (dateStr.length !== 8) return dateStr;
	return `${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}

export function FestivalCard({ festival }: { festival: Festival }) {
	const today = new Date();
	const start = new Date(
		`${festival.startDate.slice(0, 4)}-${festival.startDate.slice(4, 6)}-${festival.startDate.slice(6, 8)}`,
	);
	const isOngoing = start <= today;

	return (
		<div className="flex items-start gap-3 rounded-xl bg-(--bg-card) p-4 shadow-sm">
			<span className="text-xl">🎪</span>
			<div className="min-w-0 flex-1">
				<h4 className="truncate text-sm font-medium">{festival.title}</h4>
				<p className="mt-0.5 truncate text-xs text-(--text-muted)">{festival.address}</p>
				<div className="mt-1 flex items-center gap-2 text-xs">
					<span className="text-(--text-secondary)">
						{formatDate(festival.startDate)} ~ {formatDate(festival.endDate)}
					</span>
					{isOngoing && (
						<span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-(--color-success)">
							진행중
						</span>
					)}
					{festival.distance != null && (
						<span className="text-(--text-muted)">{festival.distance}km</span>
					)}
				</div>
			</div>
		</div>
	);
}
