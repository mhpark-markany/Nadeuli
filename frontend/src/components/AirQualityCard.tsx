import type { AirQuality } from "shared";
import { caiColor } from "../lib/colors";

export function AirQualityCard({ data }: { data: AirQuality }) {
	const color = caiColor(data.cai);

	return (
		<div className="rounded-2xl bg-white p-5 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-slate-500">대기질</h3>
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
					<dt className="text-slate-400">PM2.5</dt>
					<dd className="font-medium">{data.pm25Value}㎍/㎥</dd>
				</div>
				<div>
					<dt className="text-slate-400">PM10</dt>
					<dd className="font-medium">{data.pm10Value}㎍/㎥</dd>
				</div>
				<div>
					<dt className="text-slate-400">O₃</dt>
					<dd className="font-medium">{data.o3Value}ppm</dd>
				</div>
			</dl>
			<p className="mt-2 text-xs text-slate-400">
				{data.stationName} · {data.dataTime}
			</p>
		</div>
	);
}
