import * as jose from "jose";
import { env } from "./env.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";

export interface JwtPayload {
	sub: string; // user id
}

export async function signAccessToken(userId: string): Promise<string> {
	return new jose.SignJWT({ sub: userId })
		.setProtectedHeader({ alg: ALG })
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(secret);
}

export async function signRefreshToken(userId: string): Promise<string> {
	return new jose.SignJWT({ sub: userId })
		.setProtectedHeader({ alg: ALG })
		.setIssuedAt()
		.setExpirationTime("7d")
		.sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
	try {
		const { payload } = await jose.jwtVerify(token, secret);
		return payload as JwtPayload;
	} catch {
		return null;
	}
}
