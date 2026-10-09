# Design decisions and evidence provenance

The approved native-video approach preserves the exact shaded 3D weave without shipping its Three.js authoring renderer. Lottie would require separate conversion and a player; no size or fidelity advantage was established, so it is not adopted. The user accepted the existing approach before requesting publication.

The approved component/hook/CSS split is retained. Production assets are approximately 166 KiB MP4 and 135 KiB WebP. Existing fonts, tokens and primitives are reused. The archived design tools are not runtime dependencies.

Original implementation evidence was created before WEA-24 existed under WEA-10 S19–S22. Copy historical logs byte-for-byte and map them to S01–S04. Capture a separate current-develop behavioral RED and fresh GREEN/verification. Do not claim tooling/import failures as RED or unrun browser checks as passes.

Installed Next CSS guidance supports scoped CSS Modules and production-build inspection; no Next/Turbo configuration changes are needed. There are no unresolved research questions or new domain/data contracts.
