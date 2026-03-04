import { useCallback, useEffect, useState } from "react";
import {
	type AuthUser,
	clearTokens,
	getAccessToken,
	getKakaoLoginUrl,
	getRefreshToken,
	handleKakaoCallback,
	refreshAccessToken,
	setTokens,
} from "../lib/auth";

interface AuthState {
	user: AuthUser | null;
	isLoading: boolean;
	isAuthenticated: boolean;
}

export function useAuth() {
	const [state, setState] = useState<AuthState>({
		user: null,
		isLoading: true,
		isAuthenticated: false,
	});

	// 초기 로드: 토큰 확인 및 갱신
	useEffect(() => {
		async function init() {
			const accessToken = getAccessToken();
			const refreshToken = getRefreshToken();

			if (!accessToken && !refreshToken) {
				setState({ user: null, isLoading: false, isAuthenticated: false });
				return;
			}

			// access token 없으면 갱신 시도
			if (!accessToken && refreshToken) {
				const newToken = await refreshAccessToken();
				if (!newToken) {
					setState({ user: null, isLoading: false, isAuthenticated: false });
					return;
				}
			}

			// 저장된 사용자 정보 복원
			const savedUser = localStorage.getItem("user");
			if (savedUser) {
				setState({
					user: JSON.parse(savedUser) as AuthUser,
					isLoading: false,
					isAuthenticated: true,
				});
			} else {
				setState({ user: null, isLoading: false, isAuthenticated: false });
			}
		}
		init();
	}, []);

	const login = useCallback(async () => {
		const url = await getKakaoLoginUrl();
		window.location.href = url;
	}, []);

	const handleCallback = useCallback(async (code: string) => {
		const { accessToken, refreshToken, user } = await handleKakaoCallback(code);
		setTokens(accessToken, refreshToken);
		localStorage.setItem("user", JSON.stringify(user));
		setState({ user, isLoading: false, isAuthenticated: true });
	}, []);

	const logout = useCallback(() => {
		// 사용자별 대화 기록 삭제
		const savedUser = localStorage.getItem("user");
		if (savedUser) {
			const user = JSON.parse(savedUser) as AuthUser;
			localStorage.removeItem(`nadeuli_chat_${user.id}`);
		}
		// 비로그인 대화 기록도 삭제
		localStorage.removeItem("nadeuli_chat_guest");

		clearTokens();
		localStorage.removeItem("user");
		setState({ user: null, isLoading: false, isAuthenticated: false });
	}, []);

	return {
		...state,
		login,
		logout,
		handleCallback,
	};
}
