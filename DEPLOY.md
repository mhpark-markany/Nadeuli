# 🚀 나들이 배포 가이드

Vercel(프론트엔드) + Railway(백엔드) + Upstash(Redis) 구성.

## 1. Upstash Redis 생성

1. [Upstash Console](https://console.upstash.com/) 가입/로그인
2. **Create Database** → Region: `ap-northeast-1` (Tokyo)
3. 생성 후 **UPSTASH_REDIS_URL** 복사 (`redis://default:xxx@xxx.upstash.io:6379`)

## 2. Railway 백엔드 배포

1. [Railway](https://railway.app/) 가입 → **New Project** → **Deploy from GitHub repo**
2. 이 레포 연결 후 설정:
   - **Root Directory**: `/` (기본값)
   - Railway가 Dockerfile을 자동 감지
3. **Variables** 탭에서 환경변수 설정:
   ```
   AIRKOREA_API_KEY=실제_키
   KMA_API_KEY=실제_키
   TOUR_API_KEY=실제_키
   GEMINI_API_KEY=실제_키
   REDIS_URL=upstash에서_복사한_url
   PORT=3000
   CORS_ORIGIN=https://your-app.vercel.app
   ```
4. **Settings** → **Networking** → **Generate Domain** 클릭
5. 생성된 도메인 복사 (예: `nadeuli-backend-xxx.up.railway.app`)

## 3. Vercel 프론트엔드 배포

1. [Vercel](https://vercel.com/) 가입 → **Add New Project** → GitHub 레포 연결
2. 설정:
   - **Root Directory**: `frontend`
   - Framework: Vite (자동 감지)
3. **Environment Variables** 추가:
   ```
   VITE_API_URL=https://nadeuli-backend-xxx.up.railway.app
   ```
4. Deploy 클릭

## 4. CORS 업데이트

Vercel 배포 후 실제 도메인이 확정되면, Railway의 `CORS_ORIGIN`을 Vercel 도메인으로 업데이트:

```
CORS_ORIGIN=https://nadeuli-xxx.vercel.app
```

## 환경변수 요약

### Railway (백엔드)

| 변수 | 설명 | 필수 |
|---|---|---|
| `AIRKOREA_API_KEY` | 에어코리아 API 키 | ✅ |
| `KMA_API_KEY` | 기상청 API 키 | ✅ |
| `TOUR_API_KEY` | 한국관광공사 API 키 | ✅ |
| `GEMINI_API_KEY` | Google Gemini API 키 | ✅ |
| `REDIS_URL` | Upstash Redis URL | 권장 |
| `PORT` | 서버 포트 (Railway가 자동 설정) | - |
| `CORS_ORIGIN` | 프론트엔드 도메인 | ✅ |

### Vercel (프론트엔드)

| 변수 | 설명 | 필수 |
|---|---|---|
| `VITE_API_URL` | Railway 백엔드 URL | ✅ |
