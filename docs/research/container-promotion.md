# Container hosting and promotion research

Researched 3 October 2026. This is a proposed design, not an installed deployment pipeline.

## Hosting choice

**Yes: Docker containers can run on an ordinary AWS EC2 VM. EKS is not required.** AWS documents installing Docker directly on an EC2 instance. Container OS and CPU architecture must match the runtime, or the image must provide an appropriate platform variant. [AWS EC2 Docker instructions](https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html), [Docker pull platform/digest reference](https://docs.docker.com/reference/cli/docker/image/pull/).

| Choice                  | Benefit                                                               | Responsibility / trade-off                                                                  |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| EC2 with Docker/Compose | Simple hosting model; full host control                               | Team owns OS patching, process supervision, deployment orchestration, capacity and failover |
| ECS with Fargate        | Managed container scheduling with no container-host fleet to maintain | AWS task/network model; infrastructure and cost planning still required                     |
| ECS with EC2            | ECS orchestration with control of hosts/capacity                      | Team maintains host fleet                                                                   |
| EKS                     | Kubernetes API/ecosystem                                              | Additional Kubernetes operations and platform complexity                                    |

These service distinctions follow the [AWS container decision guide](https://docs.aws.amazon.com/decision-guides/latest/decision-guides/choosing-aws-container-service.html). AWS explicitly places instance maintenance with the customer for ECS-on-EC2. [ECS host management](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/manage-linux.html).

**Recommendation for Weave:** ECS/Fargate is a sensible initial production target for two application services. Choose EC2/Compose if host operations and simpler initial infrastructure suit your budget/team. Adopt EKS only for an actual Kubernetes requirement. This is a project recommendation, not a claim that one service is universally standard. Use managed PostgreSQL in production; retain Docker PostgreSQL for local development and CI.

## Build once; promote the exact artifact

Docker digests identify immutable image content; tags can move. The deployment input should be `repository@sha256:...`, not an environment tag such as `latest` or `prod`. [Docker image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/).

1. `develop` builds may deploy to development using `dev-<git-sha>` identifiers. No stable SemVer bump or public release occurs.
2. A release merge to `main` selects the new SemVer and records the exact source commit.
3. Build `weave-web` and `weave-api` once for that release; record their registry digests.
4. Scan/test those published images, then deploy them to QA by digest.
5. After QA gates pass, deploy those same digests to production. Never rebuild during promotion.
6. Record successful environment deployments, smoke-test results, and previous release manifest for rollback.

**Promotion does not increment SemVer.** `1.4.0` remains `1.4.0` when moving from QA to production. Optional aliases such as `qa` and `prod`, or immutable labels such as `1.4.0-qa`, may point to that content, but the digest is authoritative. A tag update alone does not replace running containers; deployment must update the desired running revision.

Amazon ECR supports adding a new tag to an existing manifest without a rebuild/download. Its documented example verifies multiple tags on one digest. [ECR retagging](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-retag.html).

**Recommended ECR policy:** immutable version/source tags; either no moving environment tags, or `IMMUTABLE_WITH_EXCLUSION` with only explicit `dev`, `qa`, and `prod` aliases mutable. ECR supports selective exceptions; never exempt `v*` or release version patterns. [ECR tag policy](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html), [AWS exception support announcement](https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-ecr-exceptions-tag-immutability/).

## One release manifest for the monorepo

Recommendation: start with one product version and a manifest mapping it to both images. Illustrative structure:

```json
{
  "version": "1.4.0",
  "sourceCommit": "<full main commit SHA>",
  "images": {
    "web": "<registry>/weave-web@sha256:<digest>",
    "api": "<registry>/weave-api@sha256:<digest>"
  },
  "migrationRevision": "<committed migration history revision>",
  "pullRequests": [123, 124],
  "linearIssues": ["WEA-42", "WEA-43"],
  "specifications": ["specs/<feature>"],
  "workflowRun": "<GitHub run URL>"
}
```

Attach the manifest to the GitHub release. Deployment records reference this manifest and environment, rather than creating environment branches. Preserve the source/image/test identity chain even if a service is unchanged. Independent service versions can be adopted later when services actually release independently.

## Next.js runtime configuration: a crucial constraint

`NEXT_PUBLIC_*` values are inlined during `next build`. Changing them at deployment does not change browser code. Next.js supports server-side runtime environment reads during dynamic rendering, explicitly enabling promotion of one Docker image. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

**Recommendation:** use same-origin browser `/api` requests and server-side runtime API configuration, or an explicit runtime public-config endpoint. Keep environment-specific URLs and secrets out of builds. Do not statically prerender environment-dependent configuration. QA and production must vary through runtime configuration without changing image bytes. Audit the current frontend configuration before claiming same-image promotion is ready.

## Database migration and rollback design

Weave currently declares Prisma 7, so use its version-specific workflow: committed migrations and `prisma migrate deploy` in non-development environments. It does not detect database drift or generate the Prisma client. Build/generate artifacts before deployment and check migration integrity independently. [Prisma 7 development and production](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production).

Recommendations:

- Run a single serialized migration job per environment from the release's exact code/artifact, not separately on every API replica.
- Use additive expand changes, compatible app rollout and backfill, then delayed contract removal. Keep old/new app revisions compatible during rollout and the rollback window. [Prisma expand/contract explanation](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern).
- Test both fresh-database and previous-release upgrade paths in CI; test compatibility of the previous image with the expanded schema.
- Rollback normally restores previous image digests/configuration. It does not undo database writes or guarantee schema rollback. Destructive migrations require explicit recovery planning, backups and restore rehearsal.
- Confirm SQL locking/time implications; a migration that works on an empty CI database can still disrupt a large production table.

## Automation controls

GitHub environments provide deployment history, branch restrictions, secrets and protection rules. Deployment concurrency is separate and must be explicitly configured. [GitHub deployment controls](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).

Recommendations:

- Separate build/release, development deploy, and release promotion jobs; only release jobs issue stable SemVer tags.
- Serialize migrations and rollouts per environment. Avoid cancelling a production deployment halfway through. Add explicit sequencing/eligibility checks when every release must ship; concurrency alone is not a durable FIFO queue.
- Gate production on QA results for the exact manifest, not merely success of the latest QA branch build. Prevent an older release silently overwriting a newer deployment.
- Make retry idempotent: never overwrite a version tag, reuse a recorded artifact, and resume failed promotion instead of issuing another version.
- Publish SBOM and provenance alongside each image; preserve the complete image index/associated metadata during registry copying and promotion. Docker's GitHub build integration supports both. Build secrets belong in secret mounts, because provenance can expose build-argument values. [Docker GitHub attestations](https://docs.docker.com/build/ci/github-actions/attestations/).
- Use GitHub-to-AWS OIDC with narrowly scoped environment roles instead of long-lived AWS keys. Match the repository's actual OIDC subject format; current GitHub documentation includes immutable repository/owner IDs for newer repositories. [GitHub AWS OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).
- Keep deployment success separate from software-release publication. Update the release's deployment status only after health checks pass.

Repository workflows cannot provision access permissions by themselves. GitHub environments/rules and AWS roles, registry, networking, compute and database must be configured once. Subsequent releases/promotions can be automated under the chosen approval policy.
