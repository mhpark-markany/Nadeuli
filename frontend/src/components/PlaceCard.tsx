import { Building2, MapPin, PersonStanding, TreeDeciduous, Utensils } from "lucide-react";
import type { Place } from "shared";
import type { LucideIcon } from "lucide-react";

const TYPE_INFO: Record<number, { icon: LucideIcon; label: string }> = {
	12: { icon: TreeDeciduous, label: "야외" },
	14: { icon: Building2, label: "실내" },
	28: { icon: PersonStanding, label: "레포츠" },
	39: { icon: Utensils, label: "음식점" },
};

export function PlaceCard({ place }: { place: Place }) {
	const info = TYPE_INFO[place.contentTypeId] ?? { icon: MapPin, label: "기타" };
	const Icon = info.icon;

	return (
		<div className="flex min-w-[140px] shrink-0 flex-col rounded-xl bg-(--bg-card) p-4 shadow-sm">
			{place.imageUrl ? (
				<img
					src={place.imageUrl}
					alt={place.title}
					className="mb-2 h-20 w-full rounded-lg object-cover"
				/>
			) : (
				<div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-(--bg-muted)">
					<Icon className="h-8 w-8 text-(--text-muted)" />
				</div>
			)}
			<h4 className="truncate text-sm font-medium">{place.title}</h4>
			<div className="mt-1 flex items-center gap-1 text-xs text-(--text-muted)">
				<span className="flex items-center gap-1 rounded bg-(--bg-muted) px-1.5 py-0.5">
					<Icon className="h-3 w-3" />
					{info.label}
				</span>
				<span>{place.distance}km</span>
			</div>
		</div>
	);
}
