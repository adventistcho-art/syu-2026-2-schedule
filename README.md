# SYU 2026-2 학사일정 통합 (로컬 → Vercel)

삼육대학교 2026학년도 2학기 일정 취합 대시보드.  
인증: 계정 맵(실무부서·이름·내선) + 팀장/팀원 선택.

## 로컬 실행

1. Neon 프로젝트 생성 후 `DATABASE_URL` 복사 ([console.neon.tech](https://console.neon.tech))
2. `.env` 작성 (`.env.example` 참고)
3. 설치·마이그레이션·시드

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

http://localhost:3000/login

## Vercel 배포

1. GitHub 저장소를 Vercel에 Import
2. Environment Variables 설정
   - `DATABASE_URL` — Neon **pooled** 연결 문자열 (`-pooler` 권장)
   - `AUTH_SECRET` — 랜덤 시크릿
   - `AUTH_URL` — `https://<프로젝트>.vercel.app`
3. Deploy 후 한 번 시드 (로컬에서 Neon URL로):

```bash
# .env 의 DATABASE_URL 을 Neon으로 맞춘 뒤
npm run db:seed
```

빌드 시 `prisma migrate deploy`가 자동 실행됩니다.
