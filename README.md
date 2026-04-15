# Venturo Content Suite

Genera contenuti social coerenti con l'identità Venturo.

## Deploy su Vercel

1. Carica questa cartella su un repo GitHub
2. Vai su [vercel.com](https://vercel.com) → New Project → importa il repo
3. Nelle **Environment Variables** aggiungi:
   - `ANTHROPIC_API_KEY` = la tua chiave Anthropic
4. Deploy

## Sviluppo locale

```bash
npm install
cp .env.example .env.local
# aggiungi la tua ANTHROPIC_API_KEY in .env.local
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)
