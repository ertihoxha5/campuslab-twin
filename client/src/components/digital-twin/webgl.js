let cachedSupport;

export function supportsWebGL() {
  if (typeof window === "undefined" || !window.WebGL2RenderingContext) return false;
  if (cachedSupport !== undefined) return cachedSupport;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    cachedSupport = Boolean(context);
    context?.getExtension?.("WEBGL_lose_context")?.loseContext();
    canvas.width = 0;
    canvas.height = 0;
    return cachedSupport;
  } catch {
    cachedSupport = false;
    return false;
  }
}
