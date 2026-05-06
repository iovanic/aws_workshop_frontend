import "server-only";

import { createServerRunner } from "@aws-amplify/adapter-nextjs";

import { getAmplifyResourcesConfig } from "./amplify";

export const { runWithAmplifyServerContext } = createServerRunner({
  config: getAmplifyResourcesConfig(),
});
