import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/employee");
  }

  return (
    <div className="hero">
      <h1>Raspored</h1>
      <p>Work shift scheduling for VUKAS.</p>
      <Link href="/login" className="btn btn-primary">
        Sign in
      </Link>
    </div>
  );
}