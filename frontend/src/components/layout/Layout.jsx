import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSocket } from '../../hooks/useSocket';

export default function Layout() {
  useSocket(); // inicia conexão global

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
