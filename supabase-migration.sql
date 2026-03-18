-- =====================================================
-- TrustiQR Migration: Add filename columns
-- Run this in Supabase SQL Editor if upgrading from v1
-- =====================================================

-- Add custom filename fields to certificates table
alter table public.certificates
  add column if not exists custom_filename text,
  add column if not exists original_filename text,
  add column if not exists template_id text,
  add column if not exists template_name text;

-- Backfill: set original_filename from certificate_title for existing rows
update public.certificates
set original_filename = coalesce(certificate_title, cert_id)
where original_filename is null;

-- Backfill: set custom_filename = original_filename if not set
update public.certificates
set custom_filename = original_filename
where custom_filename is null;