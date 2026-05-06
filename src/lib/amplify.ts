import type { ResourcesConfig } from "aws-amplify";
import { Amplify } from "aws-amplify";

let clientConfigured = false;

/**
 * Cognito `shop-user-client` (sin secreto). Mismas variables NEXT_PUBLIC_* que el Dockerfile.
 */
export function getAmplifyResourcesConfig(): ResourcesConfig {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.trim() ?? "";
  const userPoolClientId =
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim() ?? "";

  return {
    Auth: {
      Cognito: {
        userPoolId: userPoolId || "us-east-1_PLACEHOLDER",
        userPoolClientId: userPoolClientId || "placeholder-client-id",
      },
    },
  };
}

export function isAmplifyConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.trim() &&
      process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim()
  );
}

/** Idempotente: un solo `Amplify.configure` en el cliente. */
export function configureAmplifyClient(): void {
  if (!isAmplifyConfigured() || clientConfigured) {
    return;
  }
  Amplify.configure(getAmplifyResourcesConfig());
  clientConfigured = true;
}
