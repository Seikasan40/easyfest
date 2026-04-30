-- Ajoute les champs juridiques à organizations (pour générer la convention de bénévolat)
alter table public.organizations
  add column if not exists legal_siret      text,
  add column if not exists legal_address    text,
  add column if not exists president_name   text,
  add column if not exists president_title  text default 'Président·e';

comment on column public.organizations.legal_siret is 'Numéro SIRET (14 chiffres)';
comment on column public.organizations.legal_address is 'Adresse postale du siège social';
comment on column public.organizations.president_name is 'Nom du/de la président·e (signataire des conventions)';

-- Update ZIK en PACA avec les vraies infos (depuis attestation bénévoles 2021)
update public.organizations
set
  legal_siret = '838 018 968 000 19',
  legal_address = 'Montauroux, France',
  president_name = 'Pamela Giordanengo'
where slug = 'icmpaca';
