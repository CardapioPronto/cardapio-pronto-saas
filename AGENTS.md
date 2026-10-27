# Architecture rules

- Cash activity classification lives in the dependency-free shared cash-shift module and is reused by the browser and cash AI function so both apply identical receipt rules.
- Cash activity is read through a tenant-scoped, security-invoker RPC using a half-open interval and canonical orders, avoiding PostgREST row caps and duplicate mirrored payment rows.
- Preserve sales and receipt totals as separate nullable historical fields; never reinterpret legacy closing totals as confirmed receipts.
- The read-only financial page queries the active tenant through the shared cash-activity classification; its partial cash flow subtracts closed-session withdrawals at closing time, never inferring bank balances or unrecorded expenses.
- Cash audit history reads immutable events with tenant filtering, half-open date intervals, server-side pagination and existing restricted actor lookup; it never edits historical records.
- Closing reports read tenant-scoped closed sessions and frozen snapshots only; unavailable historical payment methods remain unknown instead of being rebuilt from mutable orders.
- Cash receipt photos use private tenant/session/actor storage paths and short-lived signed URLs; paths are attached at movement insertion and linked photos cannot be overwritten or deleted by clients.