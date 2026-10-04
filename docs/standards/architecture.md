# Architecture and dependency injection

## Evidence and interpretation

DDD bounded contexts explicitly separate models and their language. Clean Architecture points source dependencies inward toward policy. Starting with a monolith is an established option for discovering boundaries. These sources support the direction, not a universal requirement that every team use this architecture: [bounded contexts](https://martinfowler.com/bliki/BoundedContext.html), [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), [monolith first](https://martinfowler.com/bliki/MonolithFirst.html).

## Proposed Weave rules

Organize backend modules by business capability, not technical tables. Discover bounded contexts from the domain and record their names, responsibilities, ownership, and public contracts. A Nest module is a packaging mechanism, not automatically a bounded context.

Each business module may contain:

```text
modules/<context>/
  domain/          entities, value objects, invariants, domain services
  application/     use cases, consumer-owned ports, command/query contracts
  infrastructure/  Prisma repositories and external service adapters
  presentation/    controllers, transport DTOs, HTTP error mapping
  <context>.module.ts  composition root
```

Domain code imports no NestJS, Prisma, HTTP, React, or infrastructure code. Application code imports domain and ports, never concrete adapters. Infrastructure implements ports and maps persistence records into domain objects. Presentation calls application contracts and maps transport data. Composition roots may import concrete implementations to wire them. Shared technical adapters may live in the existing top-level infrastructure directory.

No cross-context imports into another context's internals or direct access to another context's tables. Collaborate through published application contracts or events. Keep shared kernel code small and explicitly owned. Avoid speculative entities, generic repositories, CQRS, and event sourcing without an actual requirement.

SOLID: give units coherent responsibilities; extend behavior through focused contracts; make implementations substitutable; keep interfaces small and consumer-owned; depend on abstractions. DRY applies to repeated knowledge and behavior, not every similar-looking line. Avoid abstractions that couple unrelated domains.

## Interface-first injection

TypeScript interfaces describe compile-time contracts and are erased at runtime. Nest supports symbol/string custom-provider tokens. [Nest custom providers](https://docs.nestjs.com/fundamentals/custom-providers), [TypeScript interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html).

For Weave, every authored service dependency supplied by DI must have an interface contract. Never use a concrete adapter as the constructor type in a consumer. Concrete implementations are allowed in provider bindings and factories. Framework-owned bootstrap objects are not business service injection; document unavoidable framework integration boundaries.

Illustrative files (not executable scaffold changes):

```ts
// application/ports/user-repository.ts
export interface UserRepository {
  existsByEmail(email: string): Promise<boolean>;
}

// composition token: import this single token wherever needed
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// application/register-user.ts: plain TypeScript, no Nest dependency
export class RegisterUser {
  constructor(private readonly users: UserRepository) {}

  async execute(email: string): Promise<void> {
    if (await this.users.existsByEmail(email)) {
      throw new Error('Email already registered');
    }
    // Remaining behavior follows the feature specification.
  }
}
```

The module binds USER_REPOSITORY with useClass: PrismaUserRepository and creates RegisterUser with useFactory: (users: UserRepository) => new RegisterUser(users), inject: [USER_REPOSITORY]. Controllers use an application interface plus its token. This keeps decorators and Nest metadata outside the application core. Ports must expose domain operations, never PrismaClient or Prisma-generated types.

Test contracts with in-memory fakes and verify adapters against real PostgreSQL. Inversion improves isolation; extra interfaces and wiring are its maintenance cost. Review abstractions for meaningful contracts rather than mechanically wrapping every helper function.
