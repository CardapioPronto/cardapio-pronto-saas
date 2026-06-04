ALTER TABLE public.system_configurations
ADD COLUMN IF NOT EXISTS print_paper_size text NOT NULL DEFAULT '80mm'
  CHECK (print_paper_size IN ('58mm', '80mm', 'a4')),
ADD COLUMN IF NOT EXISTS print_default_kitchen boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS print_default_cashier boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS print_default_customer boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.system_configurations.print_paper_size IS
  'Default browser print paper size for operational order receipts.';

COMMENT ON COLUMN public.system_configurations.print_default_kitchen IS
  'Whether the kitchen copy is enabled as a default operational print copy.';

COMMENT ON COLUMN public.system_configurations.print_default_cashier IS
  'Whether the cashier copy is enabled as a default operational print copy.';

COMMENT ON COLUMN public.system_configurations.print_default_customer IS
  'Whether the customer receipt is enabled as a default operational print copy.';
