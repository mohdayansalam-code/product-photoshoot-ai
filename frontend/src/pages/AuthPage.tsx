import { AuthImage } from "@/components/auth/AuthImage";
import { AuthCard } from "@/components/auth/AuthCard";

export default function AuthPage() {

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthImage />
      <AuthCard />
    </div>
  );
}
