import "server-only";

import { cookies } from "next/headers";
import { fetchAuthSession } from "aws-amplify/auth/server";

import { isAmplifyConfigured } from "./amplify";
import { runWithAmplifyServerContext } from "./amplify-server";

/** ID token de Cognito para llamadas server-side a API Gateway (mismo token que en el cliente). */
export async function getServerIdToken(): Promise<string | undefined> {
  if (!isAmplifyConfigured()) {
    return undefined;
  }

  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec, {});
        return session.tokens?.idToken?.toString();
      } catch {
        return undefined;
      }
    },
  });
}
