-- Corrige typo no ID do plano anual do Plano Pubfy no Pagar.me (homologação).

UPDATE public.plans
SET
  pagarme_plan_id_yearly = 'plan_bMQGA7T8nFnO9k84',
  pagarme_sync_status = 'pending',
  pagarme_sync_error = NULL
WHERE id = '4953d3fc-4945-4d80-bc84-58e4f6f26698'
  AND name = 'Plano Pubfy'
  AND pagarme_plan_id_yearly = 'plan_bMQGA7TBnFn09k84';
