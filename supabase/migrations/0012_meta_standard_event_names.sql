-- Default Meta event names are now Meta standard events, so every stage has a ready-made
-- column in Ads Manager (custom names like QualifiedLead need a custom conversion, and
-- custom conversions do not accept system_generated events). Admins can still rename per project.
create or replace function public.default_event_name(s public.lead_stage) returns text
language sql immutable set search_path = '' as $$
  select case s
    when 'new' then 'Lead'
    when 'qualified' then 'SubmitApplication'
    when 'appointment' then 'Schedule'
    when 'visited' then 'Contact'
    when 'reserved' then 'InitiateCheckout'
    when 'contracted' then 'AddPaymentInfo'
    when 'transferred' then 'Purchase'
  end
$$;
