import { Wind } from "lucide-react";
import type { AirQuality } from "shared";
import { caiColor, o3Color, pm10Color, pm25Color } from "../lib/colors";

export function AirQualityCard({ data }: { data: AirQuality }) {
	const color = caiColor(data.cai);

	return (
		<div className="rounded-2xl bg-(--bg-card) p-5 shadow-sm">
			<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
				<Wind className="h-4 w-4" />
				대기질(CAI)
			</h3>
			<div className="mb-3 flex items-baseline gap-2">
				<span className="text-2xl font-bold" style={{ color }}>
					{data.cai}
				</span>
				<span
					className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
					style={{ backgroundColor: color }}
				>
					{data.caiGrade}
				</span>
			</div>
			<dl className="space-y-1 text-sm">
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">초미세먼지</dt>
					<dd className="font-medium" style={{ color: pm25Color(data.pm25Value) }}>
						{data.pm25Value}㎍/㎥
					</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">미세먼지</dt>
					<dd className="font-medium" style={{ color: pm10Color(data.pm10Value) }}>
						{data.pm10Value}㎍/㎥
					</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-(--text-muted)">오존</dt>
					<dd className="font-medium" style={{ color: o3Color(data.o3Value) }}>
						{data.o3Value}ppm
					</dd>
				</div>
			</dl>
			<p className="mt-2 text-right text-xs text-(--text-muted)">
				{data.stationName} · {data.dataTime}
			</p>
		</div>
	);
}
