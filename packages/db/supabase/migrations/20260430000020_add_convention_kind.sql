-- Élargit le check engagement_kind pour autoriser 'convention_benevolat'
-- (vu sur attestation bénévoles 2021 ZIK en PACA — Pamela Giordanengo)

alter table public.signed_engagements
  drop constraint if exists signed_engagements_engagement_kind_check;

alter table public.signed_engagements
  add constraint signed_engagements_engagement_kind_check
  check (engagement_kind in (
    'charter',
    'anti_harassment',
    'image_rights',
    'pii_consent',
    'convention_benevolat'
  ));

comment on column public.signed_engagements.engagement_kind is
  'Type d''engagement signé. convention_benevolat = attestation/convention de prise de poste bénévolat (modèle ZIK en PACA).';
