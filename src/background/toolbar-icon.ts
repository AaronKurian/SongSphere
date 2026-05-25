import { BROWSER_FLAGS, ext } from "~/shared/browser";

const TOOLBAR_ICON_PATH: Record<number, string> = {
  48: "icon/48.png",
  64: "icon/64.png",
  96: "icon/96.png",
  128: "icon/128.png",
};

/** Firefox/Chrome often default to the 16px manifest icon without this. */
export function installToolbarIcon(): void {
  const apply = () =>
    BROWSER_FLAGS.isFirefox
      ? ext.browserAction.setIcon({ path: TOOLBAR_ICON_PATH })
      : ext.action.setIcon({ path: TOOLBAR_ICON_PATH });

  void Promise.resolve(apply()).catch(() => {
    void apply();
  });
}
