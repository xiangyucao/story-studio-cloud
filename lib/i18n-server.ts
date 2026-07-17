import { cookies } from "next/headers";
import { resolveLocale } from "./i18n";

export async function getUiLocale() {
  const store = await cookies();
  return resolveLocale(store.get("ui_locale")?.value);
}
