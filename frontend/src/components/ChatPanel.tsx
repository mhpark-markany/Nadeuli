import { useRef, useState } from "react";
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
}

export function ChatPanel({ lat, lng }: ChatPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const nextId = useRef(0);

	const send = async () => {
		const q = input.trim();
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
		<div className="rounded-2xl bg-white shadow-sm">
			<div className="border-b px-5 py-3">
				<h3 className="text-sm font-medium text-slate-500">💬 AI에게 물어보기</h3>
			</div>

			{/* 메시지 영역 */}
			<div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
				{messages.length === 0 && (
					<p className="text-center text-xs text-slate-300">
						"오늘 아이랑 공원 가도 될까?" 같은 질문을 해보세요
					</p>
				)}

				{messages.map((msg) => (
					<div key={msg.id} className={msg.role === "user" ? "text-right" : ""}>
						{msg.role === "user" ? (
							<span className="inline-block rounded-2xl bg-blue-500 px-4 py-2 text-sm text-white">
								{msg.content}
							</span>
						) : (
							<div className="space-y-2 text-sm text-slate-700">
								<p>{msg.content}</p>
								{msg.recommendation && <RecommendationCard rec={msg.recommendation} />}
							</div>
						)}
					</div>
				))}

				{loading && (
					<div className="flex items-center gap-2 text-xs text-slate-400">
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
						생각 중...
					</div>
				)}
			</div>

			{/* 입력 */}
			<div className="flex gap-2 border-t px-4 py-3">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
					}}
					placeholder="질문을 입력하세요..."
					className="flex-1 rounded-xl bg-slate-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
					disabled={loading}
				/>
				<button
					type="button"
					onClick={send}
					disabled={loading || !input.trim()}
					className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
				>
					전송
				</button>
			</div>
		</div>
	);
}

function RecommendationCard({ rec }: { rec: AIRecommendation }) {
	return (
		<div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
			{/* 추천 시간 */}
			<p className="text-slate-500">
				⏰ 추천 시간: {rec.bestTimeSlot.start}~{rec.bestTimeSlot.end} — {rec.bestTimeSlot.reason}
			</p>

			{/* 활동 */}
			{rec.activities.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{rec.activities.map((a) => (
						<span
							key={a.name}
							className={`rounded-lg px-2 py-1 ${a.type === "outdoor" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
						>
							{a.type === "outdoor" ? "🌳" : "🏢"} {a.name}
						</span>
					))}
				</div>
			)}

			{/* 주의사항 */}
			{rec.cautions.length > 0 && (
				<ul className="list-inside list-disc text-slate-500">
					{rec.cautions.map((c) => (
						<li key={c}>{c}</li>
					))}
				</ul>
			)}

			{/* 보건 경고 */}
			{rec.healthWarning && (
				<p className="rounded-lg bg-red-50 px-2 py-1 text-red-600">⚠️ {rec.healthWarning}</p>
			)}
		</div>
	);
}
