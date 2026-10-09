export function validateDependencyProposal({author, sameRepository, base, files}) {
  if (
    !['dependabot[bot]', 'app/dependabot'].includes(author) ||
    !sameRepository ||
    base !== 'develop'
  )
    return 'Only same-repository Dependabot proposals into develop may be adopted.';

  if (
    !files?.length ||
    files.some(
      (file) =>
        !/^(package\.json|pnpm-lock\.yaml|(?:apps|packages)\/[^/]+\/package\.json|\.github\/(?:workflows\/[^/]+\.ya?ml|actions\/[^/]+\/action\.ya?ml))$/.test(
          file,
        ),
    )
  )
    return 'Dependency proposals may change only manifests, lockfiles and Action pins.';

  return null;
}
