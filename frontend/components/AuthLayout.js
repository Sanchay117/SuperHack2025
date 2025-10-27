import { TopNav } from './TopNav';
import { SideNav } from './SideNav';

export function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideNav />
      <div className="flex-1 flex flex-col">
        <TopNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

