---
name: project-neon-connection
description: Neon PostgreSQL connection string for Recov360 project
metadata:
  type: project
---

Neon PostgreSQL connection string pour Recov360 :
`postgresql://neondb_owner:npg_h5enVAYHMPu1@ep-lucky-mouse-ai2945w7-pooler.c-4.us-east-1.aws.neon.tech/recor360?sslmode=require&channel_binding=require`

Pour SQLAlchemy async (asyncpg) :
`postgresql+asyncpg://neondb_owner:npg_h5enVAYHMPu1@ep-lucky-mouse-ai2945w7-pooler.c-4.us-east-1.aws.neon.tech/recor360?ssl=require`

**Why:** Le nom de la base est "recor360" (pas "recov360"). Le pooler Neon est activé.
**How to apply:** Toujours utiliser le dialecte `+asyncpg` pour SQLAlchemy async. Ne pas utiliser `channel_binding` avec asyncpg.
