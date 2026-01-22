
export default {
  async fetch(request: any, env: any, ctx: any) {
    try {
      const url = new URL(request.url);

      // --- Proxy Logic for Hunyuan API (CORS Bypass + Streaming Support) ---
      if (url.pathname.startsWith('/api/hunyuan')) {
        if (request.method === 'OPTIONS') {
          return new Response(null, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          });
        }

        const targetPath = url.pathname.replace('/api/hunyuan', '');
        const targetUrl = `https://api.hunyuan.cloud.tencent.com/v1${targetPath}`;
        
        const newHeaders = new Headers(request.headers);
        newHeaders.set('Host', 'api.hunyuan.cloud.tencent.com');
        
        // Use fetch with signal to handle disconnects
        const proxyResponse = await fetch(targetUrl, {
           method: 'POST',
           headers: newHeaders,
           body: request.body,
           // @ts-ignore
           duplex: 'half'
        });

        // Copy and setup headers for SSE streaming
        const responseHeaders = new Headers(proxyResponse.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('X-Accel-Buffering', 'no'); // Disable buffering for Nginx/CDN

        return new Response(proxyResponse.body, {
           status: proxyResponse.status,
           headers: responseHeaders
        });
      }

      const response = await env.ASSETS.fetch(request);
      const contentType = response.headers.get("Content-Type") || "";
      
      if (contentType.includes("text/html")) {
         const newResponse = new Response(response.body, response);
         let text = await newResponse.text();
         const safeEnv = {
           VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "",
           VITE_HUNYUAN_API_KEY: env.VITE_HUNYUAN_API_KEY || env.HUNYUAN_API_KEY || "",
         };
         const injectionScript = `<script>window.__ENV__ = ${JSON.stringify(safeEnv)};</script>`;
         text = text.replace('<!--__ENV_INJECTION__-->', injectionScript);
         return new Response(text, {
           headers: response.headers,
           status: response.status
         });
      }
      return response;
    } catch (e) {
      return new Response(`Server Error: ${e}`, { status: 500 });
    }
  }
};
