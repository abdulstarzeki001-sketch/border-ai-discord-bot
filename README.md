# Border AI — Cloudflare Workers

هذا المشروع جاهز للنشر التلقائي من GitHub إلى Cloudflare Workers.

## ما الذي يعمل؟

- `/ping`
- `/status`
- `/ask question: ...`
- OpenAI Responses API
- Discord Interaction signature verification
- `/health`
- نشر تلقائي عند كل Push إلى `main`

## 1) GitHub Secrets المطلوبة

من:
`Repository → Settings → Secrets and variables → Actions → New repository secret`

أضف:

### للنشر إلى Cloudflare

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DISCORD_PUBLIC_KEY`
- `OPENAI_API_KEY`

### لتسجيل أوامر Discord

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID` — اختياري، لكن ينصح به أثناء الاختبار حتى تظهر الأوامر فوراً.

> لا تضع التوكنات أو المفاتيح داخل ملفات المشروع.

## 2) Cloudflare API Token

أنشئ API Token بصلاحية Workers Edit على الحساب المطلوب.

بعد إضافة الأسرار، أي Push إلى `main` يشغل:
`.github/workflows/deploy-cloudflare.yml`

## 3) رابط Interaction Endpoint

بعد أول Deploy سيظهر رابط Worker شبيه:

`https://border-ai-discord-bot.<your-subdomain>.workers.dev`

في Discord Developer Portal:

`Application → General Information → Interactions Endpoint URL`

ضع:

`https://border-ai-discord-bot.<your-subdomain>.workers.dev/interactions`

ثم اضغط Save Changes.

## 4) تسجيل slash commands

من GitHub:

`Actions → Register Discord Commands → Run workflow`

بعد النجاح ستظهر:

- `/ping`
- `/status`
- `/ask`

## 5) ملاحظة مهمة عن حالة Online

هذه النسخة Cloudflare Workers تعمل عبر Discord HTTP Interactions ولا تفتح Discord Gateway دائم.

لذلك:
- أوامر Slash تعمل بصورة طبيعية.
- البوت قد يظهر **Offline** في قائمة أعضاء Discord رغم أنه يعمل.

إذا كان المطلوب أن يظهر البوت **Online** دائماً مع Presence، استخدم استضافة بعملية Node.js مستمرة مثل Replit/Render/Railway أو Cloudflare Containers على Workers Paid.

## تطوير محلي

```bash
npm install
npm run dev
```

## نشر يدوي

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put OPENAI_API_KEY
npm run deploy
```
