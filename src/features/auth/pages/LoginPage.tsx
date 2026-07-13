import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { signInWithPassword } from "@/features/auth/api";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "superadmin@demo.test" },
  { label: "Org Admin", email: "admin@demo.test" },
  { label: "Student", email: "student@demo.test" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await signInWithPassword(values.email, values.password);
      toast.success("Welcome back!");
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    }
  };

  const fillDemo = (email: string) => {
    setValue("email", email);
    setValue("password", "Password123!");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Access your assessment dashboard with your organization account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@organization.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : <LogIn className="h-4 w-4" />} Sign in
        </Button>
      </form>

      <div className="space-y-2 rounded-lg border border-dashed bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Demo accounts (password: Password123!)</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <Button key={a.email} type="button" variant="secondary" size="sm" onClick={() => fillDemo(a.email)}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Joining with an exam code?{" "}
        <Link to="/join" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <KeyRound className="h-3.5 w-3.5" /> Use a code
        </Link>
      </div>
    </div>
  );
}
