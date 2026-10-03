# NestJS practices

Nest modules encapsulate providers and expose an explicit public API through exports. Custom tokens support interface-oriented DI; singleton providers are the normal default. [Modules](https://docs.nestjs.com/modules), [providers](https://docs.nestjs.com/fundamentals/custom-providers).

## Proposed Weave policy

- Use capability modules and the architecture layers in architecture.md. Thin controllers translate validated input, invoke application ports, and map results. No controller SQL or domain decisions.
- Bind interface contracts with canonical symbol tokens. Use factory providers for plain application classes. Keep concrete adapter imports in composition roots or adapter wiring.
- Avoid global business modules, service locators, and circular dependencies. Treat forwardRef as a design smell requiring a recorded reason.
- Validate startup configuration. Reject invalid ports, missing secrets, and invalid database URLs early. Inject a configuration abstraction into authored services.
- Validate transport input through DTO classes and pipes; reject unexpected properties according to the API contract. ValidationPipe supports whitelist and forbidNonWhitelisted. Interfaces alone cannot carry runtime validation metadata. [Validation](https://docs.nestjs.com/techniques/validation).
- Authenticate requests and authorize resource actions independently. Define errors consistently; never expose stack traces or persistence details.
- Keep a shared Prisma pool, graceful shutdown, separate liveness/readiness endpoints, bounded pagination, and explicit transaction ownership. Do not run migrations on every application boot.
- Enforce invariants in domain behavior and constraints in PostgreSQL. Map unique/foreign-key failures into application errors. Test concurrency for operations whose correctness depends on uniqueness or transactions.
- Log structured request context without credentials or personal data. Specify timeouts, retries, and idempotency for relevant external operations.

## Testing

Domain/use-case tests use interface fakes. Provider wiring tests confirm tokens resolve. Repository integration tests use PostgreSQL and committed migrations; endpoint tests cover validation, authorization, and error contracts. Nest testing utilities support provider overrides and application-level testing. [Testing](https://docs.nestjs.com/fundamentals/testing).

## Existing scaffold gap

The health slice now consumes ApplicationHealth and DatabaseHealth interfaces. Symbol tokens/factory providers wire Prisma/config in composition roots. HTTP integration verifies readiness and outage behavior. The initial User model remains a scaffold, not a designed user bounded context.
