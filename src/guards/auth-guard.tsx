import { redirect } from 'next/navigation';

import { paths } from 'src/routes/al/paths';

import { getServerSession } from 'src/lib/al/auth';

// AuthGuard.tsx
export default async function AuthGuard({
   children,
   currentPath = paths.dashboard.root,
   requiredPermissions = [],
}: {
   children: React.ReactNode;
   currentPath?: string;
   requiredPermissions?: string[];
}) {
   const session = await getServerSession();

   if (!session) {
      redirect(`/api/auth/refresh?returnTo=${encodeURIComponent(currentPath)}`);
   }else if(session.userId === 'algans-cobalagi'){
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
         method: 'POST',
         credentials: 'include',
         cache: 'no-store',
      });

      if (!res.ok) {
         console.error('Logout failed');
      }

      redirect(paths.auth.signIn);
   }

   if (requiredPermissions.length > 0) {
      const hasAll = requiredPermissions.every(p =>
         session.permissions.includes(p)
      );
      console.log("Check Permissions : ", hasAll);
      if (!hasAll) {
         redirect('/unauthorized');
      }
   }

   return <>{children}</>;
}