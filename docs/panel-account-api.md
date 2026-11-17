# Panel account API integration

The Admin and Business panels forward their sign-in and password reset forms to separate versioned NestJS endpoints. See [Club onboarding](club-onboarding.md) for configuration, provisioning, and the API contract.

# Motion

The shared route wrapper is generated from Animate UI's components-page-transition registry. Panels and auth content use its fade effect. Navigation stays outside the animated region. The fade is customized to opacity only (300ms entrance, 150ms exit) to avoid full-page blur rasterization. Initial server content is visible; there is no hydration-dependent entrance. Reduced motion uses the same stationary crossfade. Unsupported browsers navigate immediately. Native browser history may navigate without animation, per the Animate UI Next.js recipe.
