'use client';

import { useState, useEffect } from 'react';

import useOfficeStore from 'src/stores/office';

import { LoadingScreen } from 'src/components/loading-screen';

import { OfficeForm } from '../components/office-form';

// ----------------------------------------------------------------------

type Props = {
   id: string;
};

export function OfficeEditView({ id }: Props) {
   const { getById } = useOfficeStore();
   const [office, setOffice] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchOffice = async () => {
         try {
            const data = await getById(id);
            setOffice(data);
         } catch (error) {
            console.error('Failed to fetch office:', error);
         } finally {
            setLoading(false);
         }
      };

      fetchOffice();
   }, [id]);

   if (loading) {
      return <LoadingScreen />;
   }

   return <OfficeForm currentOffice={office} />;
}
