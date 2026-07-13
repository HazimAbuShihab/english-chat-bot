import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Building2 } from "lucide-react";
import { getOrganizations, createOrganization } from "@/features/organizations/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || `org-${Date.now()}`;
}

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  const { data, isLoading } = useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });

  const mutation = useMutation({
    mutationFn: () => createOrganization({ name, slug: slugify(name), contact_email: email || null }),
    onSuccess: () => {
      toast.success("Organization created");
      qc.invalidateQueries({ queryKey: ["organizations"] });
      setOpen(false); setName(""); setEmail("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create organization"),
  });

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Every tenant on the platform."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New organization</Button>}
      />

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Building2} title="No organizations" description="Create the first organization to onboard admins and students." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New organization</Button>} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className="font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">/{o.slug}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{o.contact_email ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{o.plan}</Badge></TableCell>
                  <TableCell><Badge variant={o.is_active ? "success" : "secondary"}>{o.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(o.created_at), "PP")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
            <DialogDescription>Create a tenant. You can then invite its admin from the Users area.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="o-name">Name</Label>
              <Input id="o-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Language School" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-email">Contact email</Label>
              <Input id="o-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name}>
              {mutation.isPending ? <Spinner /> : null} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
