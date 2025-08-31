import { createClient } from "@sanity/client";

export const client = createClient({
  projectId: "t6kvjzfq",
  dataset: "production",
  apiVersion: "2025-01-01",
  useCdn: true,
});
