import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  AlertTriangle,
  Ticket,
  Bot,
  HardDrive,
  BarChart3,
  Settings,
  Users,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/patch-jobs', label: 'Patch Jobs', icon: HardDrive },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, role: 'technician' },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin/users', label: 'Users', icon: Users, role: 'admin' },
];

export function SideNav() {
  const router = useRouter();
  const { hasRole } = useAuth();

  return (
    <aside className="bg-gray-900 text-white w-64 min-h-screen p-4">
      <nav className="space-y-2">
        {navItems.map((item) => {
          // Check if user has required role
          if (item.role && !hasRole(item.role)) return null;

          const isActive = router.pathname === item.href || 
            router.pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

