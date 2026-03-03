import type { Place } from "shared";

const TYPE_LABEL: Record<number, { emoji: string; label: string }> = {
	12: { emoji: "🌳", label: "야외" },
	14: { emoji: "🏢", label: "실내" },
	28: { emoji: "🏃", label: "레포츠" },
	39: { emoji: "🍽️", label: "음식점" },
};

export function PlaceCard({ place }: { place: Place }) {
	const info = TYPE_LABEL[place.contentTypeId] ?? { emoji: "📍", label: "기타" };

	return (
		<div className="flex min-w-[140px] shrink-0 flex-col rounded-xl bg-white p-4 shadow-sm">
			{place.imageUrl ? (
				<img
					src={place.imageUrl}
					alt={place.title}
					className="mb-2 h-20 w-full rounded-lg object-cover"
				/>
			) : (
				<div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-slate-100 text-2xl">
					{info.emoji}
				</div>
			)}
			<h4 className="truncate text-sm font-medium">{place.title}</h4>
			<div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
				<span className="rounded bg-slate-100 px-1.5 py-0.5">
					{info.emoji} {info.label}
				</span>
				<span>{place.distance}km</span>
			</div>
		</div>
	);
}
