-- =============================================================================
-- Migration 51 — Template de contrato por tenant (RF8.3)
-- =============================================================================
alter table tenants add column if not exists template_contrato text;
