import type { ScoreGrade } from "shared";

export function gradeColor(grade: ScoreGrade): string {
	switch (grade) {
		case "최적":
			return "var(--color-score-optimal)";
		case "좋음":
			return "var(--color-score-good)";
		case "보통":
			return "var(--color-score-moderate)";
		case "주의":
			return "var(--color-score-caution)";
		case "위험":
			return "var(--color-score-danger)";
	}
}

export function caiColor(cai: number): string {
	if (cai <= 50) return "var(--color-cai-good)";
	if (cai <= 100) return "var(--color-cai-moderate)";
	if (cai <= 250) return "var(--color-cai-bad)";
	return "var(--color-cai-very-bad)";
}

export function pm25Color(value: number): string {
	if (value <= 15) return "var(--color-cai-good)";
	if (value <= 35) return "var(--color-cai-moderate)";
	if (value <= 75) return "var(--color-cai-bad)";
	return "var(--color-cai-very-bad)";
}

export function pm10Color(value: number): string {
	if (value <= 30) return "var(--color-cai-good)";
	if (value <= 80) return "var(--color-cai-moderate)";
	if (value <= 150) return "var(--color-cai-bad)";
	return "var(--color-cai-very-bad)";
}

export function o3Color(value: number): string {
	if (value <= 0.03) return "var(--color-cai-good)";
	if (value <= 0.09) return "var(--color-cai-moderate)";
	if (value <= 0.15) return "var(--color-cai-bad)";
	return "var(--color-cai-very-bad)";
}
