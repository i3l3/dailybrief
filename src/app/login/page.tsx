import { redirect } from "next/navigation";
// Keep old bookmarks working without a login screen.
export default function LegacyLoginPage() {
  redirect("/");
}
