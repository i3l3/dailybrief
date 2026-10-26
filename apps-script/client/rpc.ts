declare global {
  interface Window {
    google: { script: { run: any } };
    __GAS_BOOT__: { route: string };
  }
}
export function rpc<T>(name: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = window.google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler((error: { message?: string }) =>
        reject(new Error(error?.message || "서버와 연결하지 못했습니다.")),
      );
    runner[name](...args);
  });
}
export function currentRoute() {
  return location.hash.startsWith("#/")
    ? location.hash.slice(1)
    : window.__GAS_BOOT__?.route || "/";
}
export function routeSearch() {
  const route = currentRoute();
  return route.includes("?") ? route.slice(route.indexOf("?")) : "";
}
export function navigate(href: string) {
  if (location.hash === "#" + href) window.dispatchEvent(new Event("hashchange"));
  else location.hash = href;
}
