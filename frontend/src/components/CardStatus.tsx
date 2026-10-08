interface CardStatusProps {
	failed: boolean;
	message: string;
	onRetry: () => void;
	className?: string;
}

/** 따로 불러오는 카드가 늦거나 실패했을 때 자리를 지킨다. 불러오는 중에는 문구 없이 자리만 잡는다. */
export function CardStatus({ failed, message, onRetry, className = "" }: CardStatusProps) {
	if (!failed) {
		return (
			<div className={`animate-pulse rounded-xl bg-(--bg-muted) ${className}`} aria-busy="true" />
		);
	}

	return (
		<div className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}>
			<p className="text-xs text-(--text-muted)">{message}</p>
			<button
				type="button"
				onClick={onRetry}
				className="cursor-pointer rounded-lg bg-(--bg-muted) px-3 py-1 text-xs text-(--text-secondary) transition-opacity hover:opacity-80"
			>
				다시 시도
			</button>
		</div>
	);
}
