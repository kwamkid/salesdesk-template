-- 0015 Where the customer came from (ช่องทาง): call · ads · messenger · line · walk-in.
-- Labels live in src/config/channels.ts. Old leads stay empty. Run after 0014.

alter table public.leads
  add column channel text check (channel in ('call', 'ads', 'messenger', 'line', 'walkin'));
