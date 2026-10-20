import { publicConfig } from "@/server/config/public-config";
import { options, withApi } from "@/server/http";

export const GET = withApi("public", async () => {
  return Response.json(publicConfig());
});

export const OPTIONS = options();
