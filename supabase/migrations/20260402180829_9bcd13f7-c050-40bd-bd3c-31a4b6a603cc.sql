
-- Add new granular WhatsApp permissions to the permission_type enum
ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'whatsapp_manage_instances';
ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'whatsapp_take_conversations';
ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'whatsapp_reply_as_human';
ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'whatsapp_view_all_conversations';
ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'whatsapp_configure_automation';
