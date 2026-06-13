import { redirect } from "next/navigation";

export default function RootPage() {
  // Automatically redirects anyone who opens the site straight to /login
  redirect("/login");
}
