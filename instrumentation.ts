export async function register() {
  // Initialization
}

export const onRequestError = (err: any, request: Request, context: any) => {
  // Optional: Log error
  console.error("Request Error:", err);
};
