import {
	AlertTriangle,
	Building2,
	Clock,
	MessageCircle,
	Trash2,
	TreeDeciduous,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AIRecommendation } from "shared";
import { askAI } from "../lib/api";

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

function getStorageKey(userId?: string): string {
	return userId ? `nadeuli_chat_${userId}` : "nadeuli_chat_guest";
}

function loadMessages(userId?: string): ChatMessage[] {
	try {
		const saved = localStorage.getItem(getStorageKey(userId));
		return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
	} catch {
		return [];
	}
}

function saveMessages(messages: ChatMessage[], userId?: string) {
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
		<div className="rounded-2xl bg-(--bg-card) shadow-sm">
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
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-(--border-default) border-t-(--color-brand)" />
						생각 중...
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
					className="flex-1 rounded-xl bg-(--bg-muted) px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-(--color-brand)/30"
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
			{/* 추천 시간 */}
			<p className="flex items-center gap-1 text-(--text-secondary)">
				<Clock className="h-3 w-3" />
				추천 시간: {rec.bestTimeSlot.start}~{rec.bestTimeSlot.end} — {rec.bestTimeSlot.reason}
			</p>

			{/* 활동 */}
			{rec.activities.length > 0 && (
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
			{rec.cautions.length > 0 && (
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
