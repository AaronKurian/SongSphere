import type { CleanupManager } from "~/isolated/safety";

export const SPA_NAV_EVENT = "songsphere:navigation";

export function bindSpaNavigation(cleanup: CleanupManager, onNavigate: () => void): void {
  const fire = () => window.dispatchEvent(new Event(SPA_NAV_EVENT));

  const wrap = <T extends History["pushState"]>(original: T): T =>
    function (this: History, ...args: Parameters<T>) {
      const result = original.apply(this, args);
      fire();
      return result;
    } as T;

  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  history.pushState = wrap(pushState);
  history.replaceState = wrap(replaceState);

  const onPopState = () => fire();
  window.addEventListener("popstate", onPopState);
  window.addEventListener(SPA_NAV_EVENT, onNavigate);

  cleanup.add(() => {
    history.pushState = pushState;
    history.replaceState = replaceState;
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener(SPA_NAV_EVENT, onNavigate);
  });
}
