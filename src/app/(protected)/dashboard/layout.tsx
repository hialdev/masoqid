import { DashboardLayout } from 'src/layouts/al/dashboard/layout';

// ----------------------------------------------------------------------

type Props = {
   children: React.ReactNode;
};

export default function Layout({ children }: Props) {
   return (
      <DashboardLayout>{children}</DashboardLayout>
   );
}
