

export default {
  async fetch(request: any, env: any, ctx: any) {
    try {
      const url = new URL(request.url);

      // --- Proxy Logic for Hunyuan API (CORS Bypass) ---
      if (url.pathname.startsWith('/api/hunyuan')) {
        if (request.method !== 'POST') {
           return new Response('Method Not Allowed', { status: 405 });
        }
        
        // Strip the '/api/hunyuan' prefix to get the real path, e.g. /chat/completions
        const targetPath = url.pathname.replace('/api/hunyuan', '');
        const targetUrl = `https://api.hunyuan.cloud.tencent.com/v1${targetPath}`;
        
        // Copy headers but override Host if necessary (usually fetch handles Host)
        // We must pass the Authorization header provided by the client
        const newHeaders = new Headers(request.headers);
        newHeaders.set('Host', 'api.hunyuan.cloud.tencent.com');
        
        const proxyResponse = await fetch(targetUrl, {
           method: 'POST',
           headers: newHeaders,
           body: request.body
        });

        // Add CORS headers to the response so the browser accepts it
        const responseHeaders = new Headers(proxyResponse.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(proxyResponse.body, {
           status: proxyResponse.status,
           statusText: proxyResponse.statusText,
           headers: responseHeaders
        });
      }

      // --- Proxy Logic for Aliyun API (CORS Bypass) ---
      if (url.pathname.startsWith('/api/aliyun')) {
        if (request.method !== 'POST') {
           return new Response('Method Not Allowed', { status: 405 });
        }
        
        // Strip the '/api/aliyun' prefix to get the real path
        const targetPath = url.pathname.replace('/api/aliyun', '');
        // Target standard OpenAI compatible endpoint for DashScope
        const targetUrl = `https://dashscope.aliyuncs.com/compatible-mode/v1${targetPath}`;
        
        const newHeaders = new Headers(request.headers);
        newHeaders.set('Host', 'dashscope.aliyuncs.com');
        
        const proxyResponse = await fetch(targetUrl, {
           method: 'POST',
           headers: newHeaders,
           body: request.body
        });

        const responseHeaders = new Headers(proxyResponse.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(proxyResponse.body, {
           status: proxyResponse.status,
           statusText: proxyResponse.statusText,
           headers: responseHeaders
        });
      }

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
           VITE_ALIYUN_API_KEY: env.VITE_ALIYUN_API_KEY || env.ALIYUN_API_KEY || "",
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