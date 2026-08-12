import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors hover:text-primary',
    isActive ? 'text-primary' : 'text-muted-foreground',
  );

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="space-y-0.5">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            CMS Platform
          </p>
          <p className="font-editorial text-2xl font-semibold tracking-tight text-foreground">
            Editorial
          </p>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass} end>
            Public
          </NavLink>
          <NavLink to="/user" className={navLinkClass}>
            User Panel
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            Admin
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/user">Sign in</Link>
          </Button>
          <Button variant="editorial" size="sm" asChild>
            <Link to="/user">Write</Link>
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {children}
    </div>
  );
}
