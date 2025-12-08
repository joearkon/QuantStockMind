
export default {
  async fetch(request: any, env: any, ctx: any) {
    try {
      // 1. Fetch the static asset (HTML, JS, CSS, etc.) from the ASSETS binding
      const response = await env.ASSETS.fetch(request);

      // 2. Check if this is an HTML response (likely index.html)
      const contentType = response.headers.get("Content-Type") || "";
      
      // We inject if it's HTML. This covers the root path "/" and direct "/index.html" access
      if (contentType.includes("text/html")) {
         // Clone response to modify body (response is immutable)
         const newResponse = new Response(response.body, response);
         let text = await newResponse.text();

         // Prepare variables to inject from the Worker Environment
         // We prioritize VITE_ prefix but fallback to standard keys
         const safeEnv = {
           VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "",
           VITE_HUNYUAN_API_KEY: env.VITE_HUNYUAN_API_KEY || env.HUNYUAN_API_KEY || "",
         };

         // Create the injection script
         const injectionScript = `<script>window.__ENV__ = ${JSON.stringify(safeEnv)};</script>`;
         
         // Replace the placeholder comment in index.html
         text = text.replace('<!--__ENV_INJECTION__-->', injectionScript);

         return new Response(text, {
           headers: response.headers,
           status: response.status,
           statusText: response.statusText
         });
      }

      // Return other assets (JS, CSS, Images) as is
      return response;

    } catch (e) {
      return new Response(`Server Error: ${e}`, { status: 500 });
    }
  }
};
