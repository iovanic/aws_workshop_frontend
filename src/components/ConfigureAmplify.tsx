"use client";

import { useLayoutEffect } from "react";

import { configureAmplifyClient, isAmplifyConfigured } from "@/lib/amplify";

/**
 * Configura Amplify en el navegador antes del primer paint de hijos que usen Auth.
 */
export function ConfigureAmplify() {
  useLayoutEffect(() => {
    if (!isAmplifyConfigured()) {
      return;
    }
    configureAmplifyClient();
  }, []);

  return null;
}
