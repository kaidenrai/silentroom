import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith("/auth")) {
    return await auth0.middleware(request);
  }
  
  return;
}