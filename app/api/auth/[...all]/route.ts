import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

async function handle(method: "GET" | "POST", request: Request) {
  const auth = await getAuth();
  return toNextJsHandler(auth)[method](request);
}

export const GET = (request: Request) => handle("GET", request);
export const POST = (request: Request) => handle("POST", request);
