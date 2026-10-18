/** Public signing identities only. Never infer a release identity from debug keys. */
export function androidAssociation(fingerprints) {
  const values = fingerprints
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  if (
    !values.length ||
    values.some((value) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))
  )
    throw new Error(
      "Provide release signing SHA-256 fingerprints, comma separated.",
    );
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.gym4me.app",
        sha256_cert_fingerprints: [...new Set(values)],
      },
    },
  ];
}

export function appleAssociation(applicationId) {
  if (!/^[A-Z0-9]{10}\.com\.gym4me\.app$/.test(applicationId))
    throw new Error(
      "Use the Apple application identifier prefix plus com.gym4me.app.",
    );
  return {
    applinks: {
      details: [
        {
          appIDs: [applicationId],
          components: [{ "/": "/discovery/clubs/*" }],
        },
      ],
    },
  };
}

export function associations(fingerprints, appleAppId) {
  return {
    android: androidAssociation(fingerprints),
    apple: appleAppId ? appleAssociation(appleAppId) : undefined,
  };
}

/** Web handlers remain dynamic: signing rotation takes effect without a mobile rebuild. */
export function associationResponse(platform, environment) {
  try {
    const body =
      platform === "android"
        ? androidAssociation(environment.ANDROID_RELEASE_SHA256 ?? "")
        : platform === "apple"
          ? appleAssociation(environment.APPLE_APP_ID ?? "")
          : null;
    if (!body) throw new Error("Unknown platform.");
    return Response.json(body, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Domain association is not configured." },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
