import { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import OverviewPage from '@/components/dashboard/OverviewPage';
import ProductsPage from '@/components/dashboard/ProductsPage';
import CategoriesPage from '@/components/dashboard/CategoriesPage';
import DiscountsPage from '@/components/dashboard/DiscountsPage';
import OrdersPage from '@/components/dashboard/OrdersPage';
import ReviewsPage from '@/components/dashboard/ReviewsPage';
import UsersPage from '@/components/dashboard/UsersPage';
import AuditLogsPage from '@/components/dashboard/AuditLogsPage';
import { useAuth } from '@/hooks/use-auth';

type Page = 'overview' | 'products' | 'categories' | 'coupons' | 'orders' | 'reviews' | 'users' | 'audit-logs';

export default function Index() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const { user, signOut } = useAuth();

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <OverviewPage />;
      case 'products': return <ProductsPage />;
      case 'categories': return <CategoriesPage />;
      case 'coupons': return <DiscountsPage />;
      case 'orders': return <OrdersPage />;
      case 'reviews': return <ReviewsPage />;
      case 'users': return <UsersPage />;
      case 'audit-logs': return <AuditLogsPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} onSignOut={signOut} userEmail={user?.email} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
