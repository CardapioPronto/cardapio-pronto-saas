# Architecture rules

- Cash activity classification lives in the dependency-free shared cash-shift module and is reused by the browser and cash AI function so both apply identical receipt rules.
- Cash activity is read through a tenant-scoped, security-invoker RPC using a half-open interval and canonical orders, avoiding PostgREST row caps and duplicate mirrored payment rows.
- Preserve sales and receipt totals as separate nullable historical fields; never reinterpret legacy closing totals as confirmed receipts.