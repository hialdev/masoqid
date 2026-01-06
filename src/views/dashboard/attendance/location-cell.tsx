import { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { LoadingScreen } from 'src/components/loading-screen';

type Props = {
   lat: number;
   lng: number;
   accuracy: number;
};

export default function LocationCell({ lat, lng, accuracy }: Props) {
   const [address, setAddress] = useState<string>('');
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      let isMounted = true;

      const fetchAddress = async () => {
         // Basic debounce/delay to avoid hitting rate limits instantly if list is long
         await new Promise((r) => setTimeout(r, Math.random() * 2000));

         if (!isMounted) return;

         setLoading(true);
         try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            const response = await fetch(url);
            const data = await response.json();
            if (isMounted && data && data.display_name) {
               setAddress(data.display_name);
            }
         } catch (error) {
            console.error('Failed to resolve address', error);
         } finally {
            if (isMounted) setLoading(false);
         }
      };

      if (lat && lng) {
         fetchAddress();
      }

      return () => {
         isMounted = false;
      };
   }, [lat, lng]);

   return (
      <div>
         <Typography variant="body2">
            {lat.toFixed(5)}, {lng.toFixed(5)}
         </Typography>
         <Typography variant="caption" color="text.secondary" display="block">
            Accuracy: {accuracy.toFixed(1)} m
         </Typography>
         {loading ? (
            <Typography variant="caption" color="text.secondary">
               Loading address...
            </Typography>
         ) : (
            <Typography
               variant="caption"
               color="text.secondary"
               sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}
            >
               {address}
            </Typography>
         )}
      </div>
   );
}
