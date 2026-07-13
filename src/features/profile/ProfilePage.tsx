import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, Building2, Mail, ShieldCheck, KeyRound, Save } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { updateMyProfile, getOrganizationName } from "@/features/profile/api";
import { updatePassword } from "@/features/auth/api";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { ROLE_LABELS, type RoleKey } from "@/lib/constants";
import { initials } from "@/lib/utils";

const LOCALES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "tr", label: "Turkish" },
];

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  locale: z.string(),
  native_language: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({ password: z.string().min(8, "Use at least 8 characters"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });
type PasswordValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, profile, role, refreshProfile } = useAuth();

  const orgQ = useQuery({
    queryKey: ["org-name", profile?.organization_id],
    queryFn: () => getOrganizationName(profile!.organization_id!),
    enabled: !!profile?.organization_id,
  });

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      locale: profile?.locale ?? "en",
      native_language: profile?.native_language ?? "",
    },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (values: ProfileValues) => {
    if (!user) return;
    try {
      await updateMyProfile(user.id, {
        full_name: values.full_name,
        phone: values.phone || null,
        locale: values.locale,
        native_language: values.native_language || null,
      });
      await refreshProfile();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile");
    }
  };

  const onChangePassword = async (values: PasswordValues) => {
    try {
      await updatePassword(values.password);
      passwordForm.reset({ password: "", confirm: "" });
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    }
  };

  return (
    <div>
      <PageHeader title="Profile" description="Manage your account details and password." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity summary */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl">{initials(profile?.full_name ?? user?.email)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile?.full_name ?? "Unnamed"}</p>
              {role && <Badge variant="secondary" className="mt-1">{ROLE_LABELS[role as RoleKey]}</Badge>}
            </div>
            <Separator />
            <dl className="w-full space-y-3 text-left text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.organization_id ? (orgQ.data ?? "…") : "No organization"}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{profile?.status ?? "active"}</span>
              </div>
              {profile?.created_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Joined {format(new Date(profile.created_at), "PP")}</span>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Personal information */}
          <Card>
            <CardHeader><CardTitle className="text-base">Personal information</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full name</Label>
                    <Input id="full_name" {...profileForm.register("full_name")} />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-ro">Email</Label>
                    <Input id="email-ro" value={user?.email ?? ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...profileForm.register("phone")} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred language</Label>
                    <Select value={profileForm.watch("locale")} onValueChange={(v) => profileForm.setValue("locale", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LOCALES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="native_language">First language</Label>
                    <Input id="native_language" {...profileForm.register("native_language")} placeholder="e.g. Arabic" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting ? <Spinner /> : <Save className="h-4 w-4" />} Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Change password</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <Input id="password" type="password" autoComplete="new-password" {...passwordForm.register("password")} />
                    {passwordForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input id="confirm" type="password" autoComplete="new-password" {...passwordForm.register("confirm")} />
                    {passwordForm.formState.errors.confirm && (
                      <p className="text-xs text-destructive">{passwordForm.formState.errors.confirm.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="outline" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? <Spinner /> : null} Update password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
