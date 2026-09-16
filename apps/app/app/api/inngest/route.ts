import { serve } from "@/lib/adapters/jobs";
import { inngest } from "@/lib/queue";

const unavailableHandler = () =>
  new Response("Job queue unavailable", {
    status: 503,
    headers: { "Content-Type": "text/plain" },
  });

type RouteHandler = (req: Request) => Promise<Response> | Response;

let handlers: { GET: RouteHandler; POST: RouteHandler; PUT: RouteHandler };

try {
  if (!inngest) {
    throw new Error("Inngest client not initialized");
  }
  const inngestHandlers = serve({
    client: inngest,
    functions: [],
  });
  handlers = {
    GET: inngestHandlers.GET as unknown as RouteHandler,
    POST: inngestHandlers.POST as unknown as RouteHandler,
    PUT: inngestHandlers.PUT as unknown as RouteHandler,
  };
} catch (error) {
  console.error("Failed to initialize Inngest handlers:", error);
  handlers = {
    GET: unavailableHandler,
    POST: unavailableHandler,
    PUT: unavailableHandler,
  };
}

export const GET: RouteHandler = async (req: Request) => {
  try {
    return await handlers.GET(req);
  } catch (error) {
    console.error("Inngest GET request error:", error);
    return unavailableHandler();
  }
};

export const POST: RouteHandler = async (req: Request) => {
  try {
    return await handlers.POST(req);
  } catch (error) {
    console.error("Inngest POST request error:", error);
    return unavailableHandler();
  }
};

export const PUT: RouteHandler = async (req: Request) => {
  try {
    return await handlers.PUT(req);
  } catch (error) {
    console.error("Inngest PUT request error:", error);
    return unavailableHandler();
  }
};
