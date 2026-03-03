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
