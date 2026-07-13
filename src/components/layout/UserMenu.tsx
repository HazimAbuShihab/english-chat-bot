import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS, type RoleKey } from "@/lib/constants";
import { initials } from "@/lib/utils";

export function UserMenu() {
  const { profile, user, role, signOut } = useAuth();
  const name = profile?.full_name || user?.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar>
            <AvatarFallback>{initials(profile?.full_name ?? user?.email)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight">{name}</span>
            {role && <span className="block text-xs text-muted-foreground">{ROLE_LABELS[role as RoleKey]}</span>}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        {role && (
          <div className="px-2 pb-1.5">
            <Badge variant="secondary">{ROLE_LABELS[role as RoleKey]}</Badge>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon /> Profile (soon)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()} className="text-destructive focus:text-destructive">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
