import { useAuth } from "../hooks/useAuth";

export function LoginButton() {
	const { isAuthenticated, isLoading, user, login, logout } = useAuth();

	if (isLoading) {
		return null;
	}

	if (isAuthenticated && user) {
		return (
			<div className="flex items-center gap-2">
				{user.profileImage && (
					<img
						src={user.profileImage}
						alt={user.nickname ?? "프로필"}
						className="h-8 w-8 rounded-full"
					/>
				)}
				<span className="text-sm text-(--text-primary)">{user.nickname}</span>
				<button
					type="button"
					onClick={logout}
					className="rounded-lg bg-(--bg-muted) px-3 py-1.5 text-sm text-(--text-secondary) hover:bg-(--bg-card)"
				>
					로그아웃
				</button>
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={login}
			className="flex items-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-medium text-[#191919] hover:bg-[#FDD800]"
		>
			<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M9 0.5C4.306 0.5 0.5 3.412 0.5 7C0.5 9.24 1.974 11.198 4.222 12.396L3.222 16.098C3.162 16.318 3.412 16.498 3.602 16.368L8.048 13.398C8.358 13.428 8.676 13.448 9 13.448C13.694 13.448 17.5 10.536 17.5 6.948C17.5 3.36 13.694 0.5 9 0.5Z"
					fill="#191919"
				/>
			</svg>
			카카오 로그인
		</button>
	);
}
