import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { UserPlus, GraduationCap, Mail, Copy, Send } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { listStudents, listInvitations, createInvitation } from "@/features/students/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { initials } from "@/lib/utils";

function InviteDialog({ orgId, invitedBy, open, onOpenChange }: { orgId: string; invitedBy: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [lastCode, setLastCode] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createInvitation({ orgId, email, invitedBy, role: "student" }),
    onSuccess: (data) => {
      setLastCode(data.code);
      qc.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation created");
      setEmail("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create invitation"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setLastCode(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a student</DialogTitle>
          <DialogDescription>
            Create an invitation. When the student signs up with this email, they'll automatically join your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inv-email">Student email</Label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
          </div>
          {lastCode && (
            <div className="rounded-lg border bg-accent/50 p-3 text-sm">
              <p className="text-muted-foreground">Share this invitation code with the student:</p>
              <button
                className="mt-1 inline-flex items-center gap-2 rounded bg-background px-2 py-1 font-mono font-semibold"
                onClick={() => { void navigator.clipboard.writeText(lastCode); toast.success("Copied"); }}
              >
                {lastCode} <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !email}>
            {mutation.isPending ? <Spinner /> : <Send className="h-4 w-4" />} Create invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentsPage() {
  const { organizationId, user } = useAuth();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const studentsQ = useQuery({ queryKey: ["students", organizationId], queryFn: () => listStudents(organizationId!), enabled: !!organizationId });
  const invitesQ = useQuery({ queryKey: ["invitations", organizationId], queryFn: () => listInvitations(organizationId!), enabled: !!organizationId });

  if (!organizationId) return <EmptyState icon={GraduationCap} title="No organization" description="Your account isn't linked to an organization." />;

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage the students in your organization and send invitations."
        actions={<Button onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" /> Invite student</Button>}
      />

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students ({studentsQ.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invites">Invitations ({invitesQ.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {studentsQ.isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !studentsQ.data || studentsQ.data.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No students yet" description="Invite students to join your organization." action={<Button onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" /> Invite student</Button>} />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsQ.data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar><AvatarFallback>{initials(s.full_name ?? s.email)}</AvatarFallback></Avatar>
                          <span className="font-medium">{s.full_name ?? "Unnamed"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell><Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(s.created_at), "PP")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invites">
          {invitesQ.isLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !invitesQ.data || invitesQ.data.length === 0 ? (
            <EmptyState icon={Mail} title="No invitations" description="Invitations you send will appear here." />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitesQ.data.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell><span className="font-mono text-sm">{inv.code}</span></TableCell>
                      <TableCell><Badge variant={inv.status === "accepted" ? "success" : inv.status === "pending" ? "secondary" : "outline"}>{inv.status}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(inv.created_at), "PP")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {user && <InviteDialog orgId={organizationId} invitedBy={user.id} open={inviteOpen} onOpenChange={setInviteOpen} />}
    </div>
  );
}
