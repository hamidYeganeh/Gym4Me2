type AndroidAssociation = {
  relation: string[];
  target: {
    namespace: string;
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};
type AppleAssociation = {
  applinks: { details: { appIDs: string[]; components: { "/": string }[] }[] };
};
export function androidAssociation(fingerprints: string): AndroidAssociation[];
export function appleAssociation(applicationId: string): AppleAssociation;
export function associations(
  fingerprints: string,
  appleAppId?: string,
): {
  android: AndroidAssociation[];
  apple: AppleAssociation | undefined;
};
export function associationResponse(
  platform: "android" | "apple",
  environment: Record<string, string | undefined>,
): Response;
