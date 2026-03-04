import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Seoul";

/** KST 기준 현재 시각을 Date로 반환 (getHours 등이 KST 값) */
export function nowKST(): Date {
	const d = dayjs().tz(TZ);
	return new Date(d.year(), d.month(), d.date(), d.hour(), d.minute(), d.second(), d.millisecond());
}
