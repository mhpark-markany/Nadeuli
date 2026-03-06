import { PartyPopper } from "lucide-react";
import type { Festival } from "shared";

function formatDate(dateStr: string): string {
	if (dateStr.length !== 8) return dateStr;
	return `${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}

function isFree(fee?: string): boolean {
	if (!fee) return false;
	return /무료/.test(fee) && !/유료/.test(fee);
}

export function FestivalCard({ festival }: { festival: Festival }) {
	const today = new Date();
	const start = new Date(
		`${festival.startDate.slice(0, 4)}-${festival.startDate.slice(4, 6)}-${festival.startDate.slice(6, 8)}`,
	);
	const isOngoing = start <= today;

	return (
		<div className="flex items-start gap-3 rounded-xl bg-(--bg-card) p-4">
			{festival.image ? (
				<img
					src={festival.image}
					alt={festival.title}
					className="h-14 w-14 shrink-0 rounded-lg object-cover"
				/>
			) : (
				<PartyPopper className="h-5 w-5 shrink-0 text-(--color-brand)" />
			)}
			<div className="min-w-0 flex-1">
				<h4 className="truncate text-sm font-medium">{festival.title}</h4>
				<p className="mt-0.5 truncate text-xs text-(--text-muted)">{festival.address}</p>
				<div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
					<span className="text-(--text-secondary)">
						{formatDate(festival.startDate)} ~ {formatDate(festival.endDate)}
					</span>
					{isOngoing && (
						<span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-(--color-success)">
							진행중
						</span>
					)}
					{festival.fee && (
						<span
							className={`rounded-full px-1.5 py-0.5 ${isFree(festival.fee) ? "bg-blue-500/20 text-(--color-info)" : "bg-orange-500/20 text-(--color-warning)"}`}
						>
							{isFree(festival.fee) ? "무료" : "유료"}
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
