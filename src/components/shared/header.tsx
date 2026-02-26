"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contacts",
  "/segments": "Segments",
  "/emails": "Emails",
  "/pages": "Pages",
  "/forms": "Forms",
  "/campaigns": "Campaigns",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (path !== "/" && pathname.startsWith(path)) return title;
  }
  return "Dashboard";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-slate-400">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-indigo-600 text-sm font-medium text-white">
                U
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="cursor-pointer gap-2">
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
