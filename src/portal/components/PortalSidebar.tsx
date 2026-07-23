import { NavLink, useLocation } from 'react-router-dom';
import { Bookmark, BookOpen, CalendarDays, LogOut, Video } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

type PortalSidebarProps = {
  email: string | null;
  onMeet: () => void;
  onLogout: () => void;
};

const navItems = [
  {
    title: 'My courses',
    to: '/my-courses',
    icon: BookOpen,
  },
  {
    title: 'Saved events',
    to: '/events',
    icon: Bookmark,
  },
  {
    title: 'My events',
    to: '/my-events',
    icon: CalendarDays,
  },
] as const;

/**
 * Learner portal navigation built on shadcn Sidebar.
 *
 * @param email - signed-in account email for the footer chip
 * @param onMeet - opens the global Meet dialog
 * @param onLogout - signs out and leaves the shell
 */
export function PortalSidebar({ email, onMeet, onLogout }: PortalSidebarProps) {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const initials = (email || 'U').slice(0, 1).toUpperCase();

  const closeMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="ZenLeader Meet">
              <NavLink to="/events" onClick={closeMobile}>
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
                  <img
                    src="/assets/imgs/logo-zenleader.png"
                    alt=""
                    className="size-6 object-contain"
                  />
                </span>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ZenLeader Meet</span>
                  <span className="text-sidebar-foreground/70 truncate text-xs">
                    Learner portal
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to)}
                      tooltip={item.title}
                    >
                      <NavLink to={item.to} onClick={closeMobile}>
                        <Icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick action</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Meet — join or start"
                  onClick={() => {
                    closeMobile();
                    onMeet();
                  }}
                >
                  <Video />
                  <span>Meet</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <Button
              className="mt-2 w-full group-data-[collapsible=icon]:hidden"
              onClick={() => {
                closeMobile();
                onMeet();
              }}
            >
              <Video className="size-4" />
              Join or start
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">Signed in</span>
            <span
              className="text-sidebar-foreground/70 truncate"
              title={email || undefined}
            >
              {email || 'Account'}
            </span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={onLogout}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
