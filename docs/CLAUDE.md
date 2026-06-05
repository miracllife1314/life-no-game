# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test framework is configured. Manual verification via browser.

## UI Development Rules

**Every UI change must consider both desktop and mobile:**
- Use Tailwind responsive prefixes (`md:`, `lg:`) for layout differences.
- Fixed pixel sizes must have mobile-friendly equivalents.
- Touch targets must be ≥ 44px for mobile usability.
- Avoid `fixed`/`absolute` elements that can overlap or cause z-index issues on small screens.
- Use smooth Glassmorphism styling and active scale animations (`active:scale-95`) to match the premium theme.

## Architecture

**NLP人性溝通術課程計分系統** is a gamified score-tracking system for course participants. Participants check in daily定課, complete weekly/temporary quests, unlock achievements, register for courses, and view score details.

### App Structure

`app/page.tsx` is a monolithic client component (`"use client"`) that owns all game state and orchestrates every tab (SPA structure). Tab navigation: `daily | weekly | special | rank | achievements | course | history | captain | admin` rendered under `<main>` via `activeTab` state.

## Database Access Rules

### 🚨 Avoid N+1 Queries (避免 N+1 查詢) - CRITICAL RULE

Never perform database queries inside a loop or `.map()` in React client-side code or Server Actions. This degrades performance significantly.

**How to avoid N+1 queries:**
1. **Use Supabase Joins (Nested Selects)**: 
   Supabase allows you to join related tables directly in a single query.
   * **Correct**:
     ```typescript
     // Single query fetching submissions with task and profile details
     const { data } = await supabase
       .from('submissions')
       .select('*, tasks(name, score), profiles(name, team_id)')
       .eq('status', 'pending');
     ```
   * **Incorrect (N+1)**:
     ```typescript
     // DO NOT DO THIS: Querying tasks individually for each submission
     const { data: submissions } = await supabase.from('submissions').select('*');
     for (const sub of submissions) {
       const { data: task } = await supabase.from('tasks').select('*').eq('id', sub.task_id).single();
       sub.task = task;
     }
     ```

2. **Use SQL Joins inside Postgres functions/RPCs**:
   If executing raw database operations or RPCs, use explicit `LEFT JOIN` or `INNER JOIN` instead of querying multiple tables sequentially.

3. **Batch Queries with `in`**:
   If you must fetch related records, collect all IDs first and execute a single batch query:
   ```typescript
   const studentIds = submissions.map(s => s.student_id);
   const { data: profiles } = await supabase
     .from('profiles')
     .select('*')
     .in('id', studentIds);
   ```

### Row Level Security (RLS) & Server Actions

- For public user queries, use the client Supabase client which respects RLS policies.
- For Admin actions requiring elevated privileges (such as manual score adjustments, editing any user, or approving submissions), use the Server Action pattern wrapped with a Supabase client initialized with the `SUPABASE_SERVICE_ROLE_KEY` (Admin client).

---

## Environment Variables

Requires `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
