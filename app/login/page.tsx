import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/employee");
  }

  return (
    <div className="auth-wrap">
      <LoginForm />
      <p className="hint">
        Admin: username&nbsp;<code>VUKAS</code>
        <br />
        Employee: username&nbsp;<code>employee</code>
      </p>
    </div>
  );
}