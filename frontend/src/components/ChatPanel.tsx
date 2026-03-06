import {
	AlertTriangle,
	Building2,
	Clock,
	Cloud,
	MessageCircle,
	Trash2,
	TreeDeciduous,
	Wind,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AIRecommendation } from "shared";
import { askAI } from "../lib/api";
import { WeatherLoader } from "./WeatherLoader";

interface ChatMessage {
	id: number;
	role: "user" | "ai";
	content: string;
	recommendation?: AIRecommendation;
}

interface ChatPanelProps {
	lat: number;
	lng: number;
	userId?: string;
}

function getStorageKey(userId: string): string {
	return `nadeuli_chat_${userId}`;
}

function loadMessages(userId?: string): ChatMessage[] {
	if (!userId) return [];
	try {
		const saved = localStorage.getItem(getStorageKey(userId));
		return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
	} catch {
		return [];
	}
}

function saveMessages(messages: ChatMessage[], userId?: string) {
	if (!userId) return;
	localStorage.setItem(getStorageKey(userId), JSON.stringify(messages));
}

export function ChatPanel({ lat, lng, userId }: ChatPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(userId));
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const nextId = useRef(messages.length > 0 ? Math.max(...messages.map((m) => m.id)) + 1 : 0);

	// userId 변경 시 메시지 다시 로드
	useEffect(() => {
		const loaded = loadMessages(userId);
		setMessages(loaded);
		nextId.current = loaded.length > 0 ? Math.max(...loaded.map((m) => m.id)) + 1 : 0;
	}, [userId]);

	useEffect(() => {
		saveMessages(messages, userId);
	}, [messages, userId]);

	const clearHistory = () => {
		setMessages([]);
		nextId.current = 0;
	};

	const send = async (query?: string) => {
		const q = (query ?? input).trim();
		if (!q || loading) return;

		setInput("");
		const userMsgId = nextId.current++;
		setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: q }]);
		setLoading(true);

		try {
			const res = await askAI(q, lat, lng);
			const aiMsgId = nextId.current++;
			setMessages((prev) => [
				...prev,
				{
					id: aiMsgId,
					role: "ai",
					content: res.recommendation.summary,
					recommendation: res.recommendation,
				},
			]);
		} catch {
			const aiMsgId = nextId.current++;
			setMessages((prev) => [
				...prev,
				{ id: aiMsgId, role: "ai", content: "죄송합니다, 답변을 생성하지 못했습니다." },
			]);
		} finally {
			setLoading(false);
			requestAnimationFrame(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight));
		}
	};

	return (
		<div className="glass-card rounded-2xl shadow-sm">
			<div className="flex items-center justify-between border-b border-(--border-default) px-5 py-3">
				<h3 className="flex items-center gap-2 text-sm font-medium text-(--text-secondary)">
					<MessageCircle className="h-4 w-4" />
					AI에게 물어보기
				</h3>
				{messages.length > 0 && (
					<button
						type="button"
						onClick={clearHistory}
						className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-(--text-muted) transition-colors hover:bg-(--bg-muted) hover:text-(--color-error)"
						title="대화 기록 삭제"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			{/* 메시지 영역 */}
			<div ref={scrollRef} className="min-h-32 max-h-80 space-y-3 overflow-y-auto px-5 py-4">
				{messages.length === 0 && (
					<div className="flex h-full flex-col justify-end gap-2">
						{[
							"오늘 야외 활동하기 좋은 시간대는?",
							"지금 공원 산책해도 괜찮을까?",
							"오늘 미세먼지 주의할 점 있어?",
						].map((q) => (
							<button
								key={q}
								type="button"
								onClick={() => send(q)}
								className="cursor-pointer self-end rounded-xl bg-(--bg-muted) px-3 py-2 text-xs text-(--text-secondary) transition-colors hover:opacity-70"
							>
								{q}
							</button>
						))}
					</div>
				)}

				{messages.map((msg) => (
					<div key={msg.id} className={msg.role === "user" ? "text-right" : ""}>
						{msg.role === "user" ? (
							<span className="inline-block rounded-2xl bg-(--color-brand) px-4 py-2 text-sm text-white">
								{msg.content}
							</span>
						) : (
							<div className="space-y-2 text-sm text-(--text-primary)">
								<p>{msg.content}</p>
								{msg.recommendation && <RecommendationCard rec={msg.recommendation} />}
							</div>
						)}
					</div>
				))}

				{loading && (
					<div className="flex items-center gap-2 text-xs text-(--text-muted)">
						<WeatherLoader size={24} />
						생각 중
						<span className="inline-flex gap-0.5">
							{[0, 1, 2].map((i) => (
								<span
									key={i}
									className="inline-block h-1 w-1 rounded-full bg-current"
									style={{ animation: `bounce-dot 1.2s ${i * 0.15}s infinite` }}
								/>
							))}
						</span>
					</div>
				)}
			</div>

			{/* 입력 */}
			<div className="flex gap-2 border-t border-(--border-default) px-4 py-3">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
					}}
					placeholder="질문을 입력하세요..."
					className="flex-1 rounded-xl bg-(--bg-muted) px-4 py-2 text-base outline-none focus:ring-2 focus:ring-(--color-brand)/30"
					disabled={loading}
				/>
				<button
					type="button"
					onClick={() => send()}
					disabled={loading || !input.trim()}
					className="cursor-pointer rounded-xl bg-(--color-brand) px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
				>
					전송
				</button>
			</div>
		</div>
	);
}

function RecommendationCard({ rec }: { rec: AIRecommendation }) {
	return (
		<div className="space-y-2 rounded-xl bg-(--bg-muted) p-3 text-xs">
			{/* 날씨 */}
			{rec.weather && (
				<p className="flex items-center gap-1 text-(--text-secondary)">
					<Cloud className="h-3 w-3" />
					{rec.weather.description}
				</p>
			)}

			{/* 대기질 */}
			{rec.airQuality && (
				<p className="flex items-center gap-1 text-(--text-secondary)">
					<Wind className="h-3 w-3" />
					{rec.airQuality.description}
				</p>
			)}

			{/* 추천 시간대 */}
			{rec.timeSlots?.length > 0 && (
				<div className="space-y-1">
					{rec.timeSlots.map((slot) => (
						<p
							key={`${slot.start}-${slot.end}`}
							className="flex items-center gap-1 text-(--text-secondary)"
						>
							<Clock className="h-3 w-3" />
							{slot.start}~{slot.end} — {slot.reason}
						</p>
					))}
				</div>
			)}

			{/* 활동 */}
			{rec.activities?.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{rec.activities.map((a) => (
						<span
							key={a.name}
							className={`flex items-center gap-1 rounded-lg px-2 py-1 ${a.type === "outdoor" ? "bg-green-500/10 text-(--color-success)" : "bg-(--color-brand)/10 text-(--color-brand)"}`}
						>
							{a.type === "outdoor" ? (
								<TreeDeciduous className="h-3 w-3" />
							) : (
								<Building2 className="h-3 w-3" />
							)}
							{a.name}
						</span>
					))}
				</div>
			)}

			{/* 주의사항 */}
			{rec.cautions?.length > 0 && (
				<ul className="list-inside list-disc text-(--text-secondary)">
					{rec.cautions.map((c) => (
						<li key={c}>{c}</li>
					))}
				</ul>
			)}

			{/* 보건 경고 */}
			{rec.healthWarning && (
				<p className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-(--color-error)">
					<AlertTriangle className="h-3 w-3" />
					{rec.healthWarning}
				</p>
			)}
		</div>
	);
}
