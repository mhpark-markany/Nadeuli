import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../lib/db.js";
import { env } from "../lib/env.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const EXTRACT_INSTRUCTION = `사용자와 AI의 대화에서 사용자에 대해 기억할 만한 개인 사실을 추출하세요.

추출 대상: 가족 구성(아이 나이, 배우자 등), 반려동물, 건강 상태/알레르기, 취향/선호도, 거주지역 등
추출하지 않을 것: 일시적 상태(오늘 피곤함), 날씨/대기질 데이터, AI가 말한 내용

이미 저장된 기존 사실 목록도 제공됩니다. 중복되는 내용은 제외하세요.
새로운 사실이 없으면 빈 배열을 반환하세요.`;

interface ExtractedMemory {
	fact: string;
	category: string;
}

export async function extractMemories(
	userId: string,
	userMessage: string,
	aiResponse: string,
	existingFacts: string[],
): Promise<void> {
	const res = await ai.models.generateContent({
		model: "gemini-2.0-flash",
		contents: `기존 사실: ${JSON.stringify(existingFacts)}\n\n사용자: ${userMessage}\nAI: ${aiResponse}`,
		config: {
			systemInstruction: EXTRACT_INSTRUCTION,
			responseMimeType: "application/json",
			responseSchema: {
				type: Type.ARRAY,
				items: {
					type: Type.OBJECT,
					properties: {
						fact: { type: Type.STRING, description: "기억할 사실 (한 문장)" },
						category: {
							type: Type.STRING,
							description: "분류",
							enum: ["family", "pet", "health", "preference", "location", "other"],
						},
					},
					required: ["fact", "category"],
				},
			},
		},
	});

	const memories = JSON.parse(res.text ?? "[]") as ExtractedMemory[];
	if (memories.length === 0) return;

	await prisma.userMemory.createMany({
		data: memories.map((m) => ({ userId, fact: m.fact, category: m.category })),
	});
}

export async function getUserMemories(userId: string): Promise<string[]> {
	const memories = await prisma.userMemory.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		take: 50,
		select: { fact: true },
	});
	return memories.map((m) => m.fact);
}
