import { Icon } from "@/components/ui/icon";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui";
import { PAGES } from "../../../lib/pages";

/*
 * The shell with sample content: a window that fills the screen, the
 * sidebar in a darker tone, and the top bar with the breadcrumb, Search, and a
 * page action. In the app, routes/$org/route.tsx fills these parts. It shows
 * from 768px; a phone gets the drawer instead.
 */
export default function Example() {
  return (
    <div className="gallery-shell">
      <SidebarProvider>
        <div className="window">
          <Sidebar>
            <SidebarHeader>
              <span className="sidebar__logo">
                <span className="org-tile">F</span>
                <span className="sidebar__name">Flowfokus</span>
              </span>
              <SidebarTrigger className="sidebar__collapse" aria-label="Collapse sidebar">
                <Icon name="sidebar" aria-hidden="true" focusable="false" />
              </SidebarTrigger>
            </SidebarHeader>
            <SidebarContent aria-label="Pages">
              <SidebarMenu>
                {PAGES.map((page, index) => (
                  <SidebarMenuItem key={page.label}>
                    <SidebarMenuButton render={<a href="#shell" aria-current={index === 1 ? "page" : undefined} />}>
                      <Icon name={page.icon} aria-hidden="true" focusable="false" />
                      <span className="nav-item__label">{page.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <button type="button" className="account__button">
                <span className="account__avatar" aria-hidden="true">KW</span>
                <span className="account__name">Kennedy Wee</span>
                <Icon name="chevrons" className="account__chevron" aria-hidden="true" focusable="false" />
              </button>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="topbar">
              <div className="topbar__context">
                <span className="org-tile">C</span>
                <span>Chainsaw</span>
                <span className="topbar__slash" aria-hidden="true">/</span>
                <span>Bangsar</span>
                <span className="topbar__slash" aria-hidden="true">/</span>
                <span>Members</span>
              </div>
              <div className="topbar__end">
                <Button size="compact" variant="secondary">
                  <Icon name="search" aria-hidden="true" focusable="false" />
                  <span className="visually-hidden">Search</span>
                  <Kbd>⌘K</Kbd>
                </Button>
                <Button size="compact">
                  New member
                  <Kbd>N</Kbd>
                </Button>
              </div>
            </header>
            <main className="main" />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
