# Health contract

GET /api/health → 200 {status: "ok", service: "weave-api"}. Does not query PostgreSQL.
GET /api/health/ready → 200 {status: "ok", database: "connected"} after SELECT 1; unavailable database → 503 with a generic message. No connection details returned.

Web client accepts exact status/service through unknown narrowing; unavailable/malformed responses display Unavailable. Mobile Button public props: readonly label, onPress, disabled?, loading?; disabled/loading prevent action. Policy tests use exported validators; API use-case tests use interface fakes and HTTP integration validates Nest wiring.
