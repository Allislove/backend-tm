-- =============================================================================
-- Números de ticket con 5+ dígitos (ejecutar UNA vez sobre una base que ya tenía 001)
--   psql -U postgres -d tickets_management -f sql/005_ticket_number.sql
--
-- El lpad(..., 4) de next_ticket_number() recortaba 10000 a "1000" y el INSERT
-- chocaba con tickets_ticket_number_key. Esta versión solo rellena a 4 dígitos
-- cuando el número es más corto; a partir de 10000 queda TCK-10000.
-- =============================================================================

set search_path to tms, public;

create or replace function next_ticket_number()
returns text
language plpgsql
as $$
declare
  next_value bigint;
  digits text;
begin
  next_value := nextval('tms.ticket_number_seq');
  digits := next_value::text;
  if length(digits) < 4 then
    digits := lpad(digits, 4, '0');
  end if;
  return 'TCK-' || digits;
end;
$$;
