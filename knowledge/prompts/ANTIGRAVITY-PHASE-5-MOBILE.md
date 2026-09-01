# Antigravity — Phase 5 Mobile App

**Canonical prompt lives in the mobile repo:**  
`C:\Users\prabu\Desktop\prabu-life-os-mobile\ANTIGRAVITY-START.md`

Copy that entire file into Antigravity as the kickoff prompt.

## What's prepared

| Item | Location |
|------|----------|
| Expo scaffold (tabs template) | `prabu-life-os-mobile/` |
| Architecture + design system | `prabu-life-os-mobile/docs/` |
| API contract for mobile | `prabu-life-os-mobile/docs/API-CONTRACT.md` |
| Backend (live) | `https://prabu-life-os-production.up.railway.app/api` |
| Finance Intelligence API | `/api/finance/intelligence/*` |
| AI agent system prompt | `knowledge/prompts/FINANCE-INTELLIGENCE-AGENT.md` |

## User provides to Antigravity

1. `PRABU_MCP_API_KEY` (for `.env`)
2. Optional: `EXPO_PUBLIC_GEMINI_API_KEY` for in-app AI

## After Antigravity ships

1. Run DB migration `002_financial_transactions.sql` on Railway if not done
2. Re-auth Gmail + bridge tokens
3. Test SMS ingest on Android device
