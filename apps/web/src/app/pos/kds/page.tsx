import { redirect } from "next/navigation";

/** Bookmarks to legacy /pos/kds → unified tablet kitchen (no duplicated UI). */
export default function PosKdsRedirectPage() {
  redirect("/tablet/kitchen");
}
