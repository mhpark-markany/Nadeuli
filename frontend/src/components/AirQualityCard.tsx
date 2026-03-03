import type { AirQuality } from "shared";
import { caiColor } from "../lib/colors";

export function AirQualityCard({ data }: { data: AirQuality }) {
	const color = caiColor(data.cai);

	return (
		<div className="rounded-2xl bg-(--bg-card) p-5 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-(--text-secondary)">대기질</h3>
			<div className="mb-3 flex items-baseline gap-2">
				<span className="text-2xl font-bold" style={{ color }}>
					CAI {data.cai}
				</span>
				<span
					className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
					style={{ backgroundColor: color }}
				>
					{data.caiGrade}
				</span>
			</div>
			<dl className="grid grid-cols-3 gap-2 text-sm">
				<div>
					<dt className="text-(--text-muted)">PM2.5</dt>
					<dd className="font-medium">{data.pm25Value}㎍/㎥</dd>
				</div>
				<div>
					<dt className="text-(--text-muted)">PM10</dt>
					<dd className="font-medium">{data.pm10Value}㎍/㎥</dd>
				</div>
				<div>
					<dt className="text-(--text-muted)">O₃</dt>
					<dd className="font-medium">{data.o3Value}ppm</dd>
				</div>
			</dl>
			<p className="mt-2 text-xs text-(--text-muted)">
				{data.stationName} · {data.dataTime}
			</p>
		</div>
	);
}
