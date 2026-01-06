'use client';

import { useParams } from 'next/navigation';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { ExampleRichForm } from './components/form';
import { paths } from 'src/routes/al/paths';
import useExampleRichStore from 'src/stores/example-rich';
import { useEffect, useState } from 'react';
import { toast } from 'src/components/snackbar';

export default function ExampleRichEdit({ id }: { id: string }) {
   const params = useParams();
   const { detail } = useExampleRichStore();
   const [exampleRichData, setExampleRichData] = useState<undefined | any>(undefined);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchExampleRichDetail = async () => {
         const exampleRichId = id || (Array.isArray(params?.id) ? params.id[0] : params?.id);
         if (!exampleRichId) return;

         try {
            const res = await detail({ id: exampleRichId });
            if (res.success) {
               setExampleRichData(res.data);
            } else {
               toast.error('Gagal memuat data event type');
            }
         } catch (error) {
            toast.error('Gagal memuat data event type');
            console.error('Error fetching event type detail:', error);
         } finally {
            setLoading(false);
         }
      };

      fetchExampleRichDetail();
   }, [id, params, detail]);

   if (loading) {
      return <div>Loading...</div>;
   }

   if (!id && !params?.id) {
      return <div>Invalid event type ID</div>;
   }

   return (
      <>
         <CustomBreadcrumbs
            heading="Edit Event Type"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Event Types', href: paths.dashboard.example_rich.root },
               { name: 'Edit' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <ExampleRichForm
            currentExampleRich={exampleRichData}
            onSuccess={() => console.log('Event type updated successfully')}
         />
      </>
   );
}
