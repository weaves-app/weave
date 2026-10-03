# Data model

Existing User scaffold: UUID id; unique email; optional name; createdAt/updatedAt. No public user feature/API is introduced. Health application ports contain only status results and ping(), not Prisma models. Shared design tokens have no persisted state. SDD feature workflow metadata records ticket, scenario confirmation and IDs; release manifests record software version, commit and image digests.
