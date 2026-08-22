---
name: Supabase schema compatibility
description: Durable guidance for changing the app’s connected Supabase database without conflicting with existing shared tables.
---

The connected Supabase project is an existing shared database, not an empty database created for this app. Its career catalog and analytics tables use UUID and project-specific column names, so imported SQL must be adapted to the live schema instead of replacing or dropping tables.

**Why:** Applying the imported schema directly caused a foreign-key type conflict and would risk damaging unrelated project data.

**How to apply:** Before future Supabase DDL, inspect the live tables with the Supabase management tools, prefer additive compatibility migrations, and keep app writes server-side with the service-role key.