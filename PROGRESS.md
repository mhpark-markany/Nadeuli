# 나들이 (Nadeuli) — 개발 진행 상황

> PRD: `../PRD.md` 참조
> 마지막 업데이트: 2026-03-03

---

## 현재 상태: Phase 3 완료 ✅

`yarn build` 성공, `npx @biomejs/biome check .` 통과 확인됨.

---

## 프로젝트 구조

```
nadeuli/
├── shared/src/types.ts              # 공유 타입 정의 (AIRecommendation, AskRequest, AskResponse 추가)
├── backend/src/
│   ├── index.ts                     # Hono 서버 (포트 3000, 7개 라우트)
│   ├── lib/
│   │   ├── env.ts                   # 환경변수 검증 (AIRKOREA, KMA, TOUR, GEMINI API 키)
│   │   └── cache.ts                 # Redis 캐시 (미연결 시 graceful degradation)
│   ├── services/
│   │   ├── air-quality.ts           # 에어코리아 API + CAI 산출
│   │   ├── weather.ts               # 기상청 초단기실황 + 위경도→격자 변환 + WBGT/체감온도
│   │   ├── life-index.ts            # 생활기상지수 (자외선, 꽃가루, 식중독, 대기정체)
│   │   ├── score.ts                 # 비선형 적합도 산출 엔진 (PRD 5단계 알고리즘)
│   │   ├── geo.ts                   # TM 좌표 변환 (proj4) + 행정동 코드 매핑
│   │   ├── places.ts                # TourAPI 4.0 위치 기반 장소 조회
│   │   ├── festivals.ts             # 전국축제표준데이터 API 연동
│   │   ├── gemini.ts                # [Phase 3] Gemini 2.0 Flash 연동 + 프롬프트 구성
│   │   └── fallback.ts              # [Phase 3] 규칙 기반 폴백 (AI 실패/한도 소진 시)
│   └── routes/
│       ├── air-quality.ts           # GET /api/air-quality?lat=&lng=
│       ├── weather.ts               # GET /api/weather?lat=&lng=
│       ├── life-index.ts            # GET /api/life-index?lat=&lng=
│       ├── score.ts                 # GET /api/score?lat=&lng=&sensitive=
│       ├── places.ts                # GET /api/places?lat=&lng=&radius=&type=
│       ├── festivals.ts             # GET /api/festivals?page=
│       └── ask.ts                   # [Phase 3] POST /api/ask (시맨틱 캐시 포함)
├── frontend/src/
│   ├── App.tsx                      # 메인 대시보드 (ChatPanel 통합)
│   ├── components/
│   │   ├── ScoreRing.tsx            # 적합도 원형 게이지 (SVG)
│   │   ├── AirQualityCard.tsx       # CAI 4단계 색상 표출
│   │   ├── WeatherCard.tsx          # 날씨 + WBGT 등급 표시
│   │   ├── HourlyTimeline.tsx       # 시간대별 바 차트 (단기예보 연동 필요)
│   │   ├── PlaceCard.tsx            # 장소 카드 (이미지/아이콘 + 거리)
│   │   ├── FestivalCard.tsx         # 축제 카드 (기간 + 진행중 배지)
│   │   └── ChatPanel.tsx            # [Phase 3] AI 채팅 UI (질문→추천 카드)
│   ├── hooks/useGeolocation.ts      # 브라우저 위치 권한
│   └── lib/
│       ├── api.ts                   # fetchDashboard + fetchPlaces + fetchFestivals + askAI
│       └── colors.ts                # 등급별 CSS 변수 매핑
└── biome.json                       # noExplicitAny, noNonNullAssertion 강제
```

## 실행 방법

```bash
# .env 설정
cp .env.example .env
# AIRKOREA_API_KEY, KMA_API_KEY, TOUR_API_KEY, GEMINI_API_KEY 입력

# 의존성 설치
yarn install

# 개발
yarn dev:be   # 백엔드 (localhost:3000)
yarn dev:fe   # 프론트엔드 (Vite, /api → localhost:3000 프록시)

# 빌드 검증
yarn build
npx @biomejs/biome check .
```

---

## Phase 1에서 구현된 핵심 로직

- **CAI 산출**: `calcSubCAI()` — PM2.5/PM10/O3 각각 breakpoint 기반 선형 보간 → 최고치 채택
- **WBGT 간이 산출**: `0.567×기온 + 0.393×수증기압 + 3.94`
- **체감온도**: 여름(Heat Index), 겨울(Wind Chill) 분기
- **적합도 5단계**: 가중합산(45/30/12/13) → WBGT 오버라이드 → 보건 차단 → 계절성 곱연산자
- **Redis 캐시**: 측정소/격자/지역코드 기반 키, 1시간 TTL

---

## Phase 2에서 구현된 핵심 로직

- **TM 좌표 변환**: proj4 라이브러리로 WGS84(EPSG:4326) → TM 중부원점(EPSG:5181) 변환
- **행정동 코드 매핑**: 17개 시/도 중심 좌표 기반 최근접 매칭으로 기상청 생활기상지수 areaNo 자동 산출
- **TourAPI 4.0 연동**: `locationBasedList2` — contentTypeId별 병렬 조회, 거리순 정렬, 최대 20개
- **전국축제표준데이터**: 종료되지 않은 축제만 필터링
- **캐시 전략**: 장소/축제 24시간 TTL

---

## Phase 3에서 구현된 핵심 로직

- **Gemini 2.0 Flash 연동**: `@google/generative-ai` SDK, `gemini-2.0-flash` 모델, JSON structured output
- **System Instructions**: 질병관리청 보건 가이드라인 강제 (PM2.5/PM10 임계치 초과 시 야외 추천 차단), CAI/WBGT 등급 해석 기준 포함
- **프롬프트 구성**: 기상 데이터 + 장소 데이터를 단일 JSON으로 병합하여 1회 호출 (다중 객체 병렬 집계)
- **환각 방지**: "반드시 제공된 JSON 데이터 배열 내의 장소만 추천" 강제
- **시맨틱 프롬프트 캐시**: Redis 기반, `ai:{위도}:{경도}:{날짜}_{30분슬롯}` 키, 30분 TTL
- **규칙 기반 폴백**: Gemini 호출 실패/한도 소진 시 score + places 데이터 기반 정적 추천 생성
- **채팅 UI**: ChatPanel 컴포넌트 — 메시지 목록 + 입력 + RecommendationCard (추천 시간/활동/주의사항/보건 경고)
- **POST /api/ask**: 환경 데이터 병렬 수집 → 캐시 확인 → Gemini 호출(폴백) → 캐시 저장
- **국립공원 탐방로 기능 제거**: 국립공원공단 공식 오픈API가 data.go.kr에 존재하지 않아 trails 서비스/라우트/타입/환경변수 전체 제거 (PRD 크롤링 금지 원칙 준수)

---

## Phase 1 기술 부채 해소 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| HourlyTimeline 빈 배열 | ⏳ Phase 4 | 단기예보 연동 필요 |
| 위경도 → TM 좌표 변환 | ✅ Phase 2 | proj4 EPSG:5181 적용 |
| 생활기상지수 areaNo 하드코딩 | ✅ Phase 2 | 시/도 최근접 매칭 |
| weather.ts sky 필드 | ⏳ Phase 4 | 단기예보에서 보강 필요 |
| 에러 바운더리 없음 | ⏳ Phase 4 | React Error Boundary |

---

## 알려진 제한사항 / 기술 부채

1. **HourlyTimeline이 빈 배열**: `score.ts`의 `hourlyForecast`가 항상 `[]` 반환. 기상청 단기예보 연동 필요
2. **weather.ts의 sky 필드**: 초단기실황에는 SKY 카테고리가 없어서 항상 "맑음" 반환
3. **에러 바운더리 없음**: 프론트엔드에 React Error Boundary 미적용
4. **행정동 코드 정확도**: 시/도 단위 최근접 매칭이라 시/군/구 단위 정확도 부족
5. **축제 API 엔드포인트**: 전국축제표준데이터 API의 실제 엔드포인트/응답 형식은 data.go.kr 발급 후 검증 필요
6. **시맨틱 캐시 키 단순화**: 현재 위경도+시간대 기반이라 동일 지역 다른 질문에도 같은 캐시 반환. 질문 의도 분류 추가 시 개선 가능

---

## 다음 단계: Phase 4 — 사용자 개인화 및 클라이언트 고도화 (1주)

### 4-1. 사용자 프로필
- PostgreSQL + Drizzle ORM 셋업
- `backend/src/db/` 디렉토리 (schema, migrations)
- 프로필 CRUD API: `POST/GET/PUT /api/profile`
- 건강 상태, 동반자, 민감군 여부 → AI 추천 분기

### 4-2. 시간대별 타임라인 완성
- 기상청 단기예보(`getVilageFcst`) 연동
- 3시간 간격 예보 데이터로 `hourlyForecast` 배열 채우기
- HourlyTimeline 컴포넌트 활성화

### 4-3. 반응형 디자인
- 모바일 최적화 (현재 `max-w-lg` 기반이라 큰 작업은 아님)
- 터치 인터랙션 개선

### 4-4. 에러 핸들링 강화
- React Error Boundary 추가
- API 실패 시 재시도 로직 (exponential backoff)
- 로딩 스켈레톤 UI

### 4-5. 배포
- Cloudflare Pages (프론트엔드)
- Railway 또는 Fly.io (백엔드)
- Redis Cloud (캐시)
- PostgreSQL (Supabase 또는 Railway)

---

## 검증 체크리스트 (매 Phase 완료 시)

```bash
yarn build                        # shared → backend → frontend 순차 빌드
npx @biomejs/biome check .        # format + lint + import 정리
# noNonNullAssertion, noExplicitAny 위반 없는지 확인
```
