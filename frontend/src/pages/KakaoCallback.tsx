import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export function KakaoCallback() {
	const { handleCallback } = useAuth();

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");

		if (code) {
			handleCallback(code)
				.then(() => {
					window.location.href = "/";
				})
				.catch(() => {
					window.location.href = "/?error=login_failed";
				});
		} else {
			window.location.href = "/?error=no_code";
		}
	}, [handleCallback]);

	return (
		<div className="flex h-screen items-center justify-center">
			<p className="text-(--text-secondary)">로그인 처리 중...</p>
		</div>
	);
}
