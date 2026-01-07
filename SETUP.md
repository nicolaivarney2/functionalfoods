# 🚀 Functional Foods - Development Setup Guide

## Quick Start

1. **Klon repository og installer dependencies:**
   ```bash
   git clone <repo-url>
   cd functionalfoods
   npm install
   ```

2. **Opret `.env.local` fil:**
   ```bash
   cp env.example .env.local
   ```
   Udfyld alle environment variabler i `.env.local` med dine faktiske værdier.

3. **Start udviklingsserveren:**
   ```bash
   npm run dev
   ```

4. **Åbn browser:**
   Gå til `http://localhost:3000`

## 📦 Nye NPM Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Kør ESLint
- `npm run lint:fix` - Fix ESLint fejl automatisk
- `npm run format` - Formatér al kode med Prettier
- `npm run format:check` - Tjek om kode er formateret korrekt
- `npm run type-check` - Tjek TypeScript fejl
- `npm run type-check:watch` - Tjek TypeScript fejl i watch mode

## 🛠️ Development Tools

### Prettier (Code Formatting)
- Automatisk formatering ved save (hvis Cursor er konfigureret)
- Kør `npm run format` for at formatere hele projektet
- Konfiguration i `.prettierrc.json`

### ESLint
- Kører automatisk ved save
- Konfiguration i `.eslintrc.json`
- Integreret med Prettier

### TypeScript
- Strict mode aktiveret
- Type checking med `npm run type-check`
- Forbedret konfiguration i `tsconfig.json`

## 🔑 Environment Variabler

Se `env.example` for alle nødvendige variabler:

**Påkrævet:**
- `NEXT_PUBLIC_SUPABASE_URL` - Din Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Din Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Din Supabase service role key
- `OPENAI_API_KEY` - Din OpenAI API key

**Valgfri:**
- `GOMA_API_KEY` - For supermarket data
- `NEXT_PUBLIC_SITE_URL` - Din site URL (default: localhost:3000)
- OpenAI Assistant IDs for forskellige kategorier

## 🎨 Cursor/VS Code Settings

Projektet inkluderer optimerede settings i `.cursor/settings.json`:
- Automatisk formatering ved save
- ESLint auto-fix ved save
- TypeScript workspace version
- Tailwind CSS support

## 📝 Code Style

- **Quotes:** Single quotes (`'`)
- **Semicolons:** Ingen semicolons
- **Tab Width:** 2 spaces
- **Trailing Commas:** ES5 style
- **Print Width:** 100 characters

## 🔍 Type Checking

Kør type checking før commit:
```bash
npm run type-check
```

## 🚨 Troubleshooting

**Serveren starter ikke:**
- Tjek at alle environment variabler er sat i `.env.local`
- Tjek at port 3000 ikke er optaget: `lsof -i :3000`

**TypeScript fejl:**
- Kør `npm run type-check` for at se alle fejl
- Mange fejl kan fixes automatisk med `npm run lint:fix`

**Formatting problemer:**
- Kør `npm run format` for at formatere hele projektet
- Tjek at Prettier extension er installeret i Cursor





