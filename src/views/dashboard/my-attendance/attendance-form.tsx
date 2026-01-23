'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { LoadingScreen } from 'src/components/loading-screen';
import { toast } from 'src/components/snackbar';
import { useRouter } from 'src/routes/hooks';
import useAttendanceStore from 'src/stores/attendance-store';

type Props = {
   type: 'CHECK_IN' | 'CHECK_OUT';
};

export function AttendanceForm({ type }: Props) {
   const router = useRouter();
   const { checkIn, checkOut } = useAttendanceStore();
   const [loading, setLoading] = useState(false);
   const [location, setLocation] = useState<{ lat: number; lng: number; acc: number } | null>(null);
   const [address, setAddress] = useState<string>('');
   const [addressDetails, setAddressDetails] = useState<any>(null);
   const [stream, setStream] = useState<MediaStream | null>(null);
   const [photo, setPhoto] = useState<Blob | null>(null);
   const videoRef = useRef<HTMLVideoElement>(null);
   const canvasRef = useRef<HTMLCanvasElement>(null);

   const getAddress = async (lat: number, lng: number) => {
      try {
         const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
         const response = await fetch(url);
         const data = await response.json();
         if (data && data.address) {
            setAddressDetails(data.address);
            setAddress(data.display_name);
         }
      } catch (error) {
         console.error('Gagal mengambil alamat:', error);
      }
   };

   // Initialize Location
   const getLocation = () => {
      if (!navigator.geolocation) {
         toast.error('Geolocation tidak didukung browser ini.');
         return;
      }
      navigator.geolocation.getCurrentPosition(
         (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setLocation({
               lat: lat,
               lng: lng,
               acc: position.coords.accuracy,
            });
            getAddress(lat, lng);
         },
         (error) => {
            toast.error('Gagal mendapatkan lokasi: ' + error.message);
         },
         { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
   };

   useEffect(() => {
      let mediaStream: MediaStream | null = null;

      const initCamera = async () => {
         try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
               video: { facingMode: 'user' },
            });
            setStream(mediaStream);
         } catch (err) {
            toast.error('Gagal mengakses kamera. Pastikan izin diberikan.');
         }
      };

      if (!photo) {
         initCamera();
      }
      getLocation();

      return () => {
         if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
         }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [photo]);

   useEffect(() => {
      if (videoRef.current && stream) {
         videoRef.current.srcObject = stream;
      }
   }, [stream]);

   const takePhoto = () => {
      if (videoRef.current && canvasRef.current) {
         const context = canvasRef.current.getContext('2d');
         if (context) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            canvasRef.current.toBlob(
               (blob) => {
                  setPhoto(blob);
               },
               'image/jpeg',
               0.8
            );
         }
      }
   };

   const retakePhoto = () => {
      setPhoto(null);
   };

   const handleSubmit = async () => {
      if (!location || !photo) {
         toast.error('Lokasi dan Foto wajib ada!');
         return;
      }

      setLoading(true);
      try {
         const formData = new FormData();
         formData.append('latitude', location.lat.toString());
         formData.append('longitude', location.lng.toString());
         formData.append('location_accuracy', location.acc.toString());
         formData.append('photo', photo, 'attendance.jpg');

         let res;
         if (type === 'CHECK_IN') {
            res = await checkIn(formData);
         } else {
            res = await checkOut(formData);
         }

         if (res.success) {
            toast.success(`Berhasil ${type === 'CHECK_IN' ? 'Check In' : 'Check Out'}`);
            router.push('/dashboard/my-attendance');
         } else {
            toast.error(res.message || 'Gagal mengirim absensi');
         }
      } catch (error: any) {
         // Extract user-friendly message from API response
         const errorMessage =
            error?.response?.data?.message || error?.message || 'Terjadi kesalahan';
         toast.error(errorMessage);
      } finally {
         setLoading(false);
      }
   };

   // Removed blocking loading screen to ensure Effect runs and mounts video
   if (loading) {
      return <LoadingScreen />;
   }

   return (
      <Card sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
         <Typography variant="h4" gutterBottom>
            {type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
         </Typography>

         <Stack spacing={3}>
            <Box
               sx={{
                  position: 'relative',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'black',
                  height: 400,
               }}
            >
               {!photo ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                     ref={videoRef}
                     autoPlay
                     playsInline
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
               ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                     src={URL.createObjectURL(photo)}
                     alt="Preview"
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
               )}
               <canvas ref={canvasRef} style={{ display: 'none' }} />
            </Box>

            {!photo ? (
               <Button variant="contained" onClick={takePhoto}>
                  Ambil Foto
               </Button>
            ) : (
               <Button variant="outlined" onClick={retakePhoto}>
                  Ambil Ulang
               </Button>
            )}

            <Box>
               <Typography variant="subtitle2">Lokasi Terkini:</Typography>
               {location ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                     <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Typography variant="body2">Lat: {location.lat.toFixed(6)}</Typography>
                        <Typography variant="body2">Lng: {location.lng.toFixed(6)}</Typography>
                     </Box>

                     <Typography
                        variant="body2"
                        color={location.acc > 150 ? 'error.main' : 'text.secondary'}
                     >
                        Akurasi: {location.acc.toFixed(2)} meter
                        {location.acc > 150 && ' (Akurasi rendah!)'}
                     </Typography>

                     {address && (
                        <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                           <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                              Alamat:
                           </Typography>
                           <Typography
                              variant="caption"
                              component="div"
                              sx={{ color: 'text.secondary' }}
                           >
                              {addressDetails?.road && (
                                 <div key="road">Jalan: {addressDetails.road}</div>
                              )}
                              {addressDetails?.village && (
                                 <div key="village">Kelurahan: {addressDetails.village}</div>
                              )}
                              {addressDetails?.suburb && (
                                 <div key="suburb">Kecamatan: {addressDetails.suburb}</div>
                              )}
                              {addressDetails?.city_district && (
                                 <div key="city_dist">Kota/Kab: {addressDetails.city_district}</div>
                              )}
                              {addressDetails?.city && (
                                 <div key="city">Kota: {addressDetails.city}</div>
                              )}
                              {addressDetails?.county && (
                                 <div key="county">Kabupaten: {addressDetails.county}</div>
                              )}
                              {addressDetails?.state && (
                                 <div key="state">Provinsi: {addressDetails.state}</div>
                              )}
                              {addressDetails?.postcode && (
                                 <div key="postcode">Kode Pos: {addressDetails.postcode}</div>
                              )}
                              <div key="full" style={{ marginTop: 8 }}>
                                 <em>{address}</em>
                              </div>
                           </Typography>
                        </Box>
                     )}
                  </Stack>
               ) : (
                  <Typography variant="body2" color="text.secondary">
                     Mencari lokasi...
                  </Typography>
               )}
            </Box>

            <Button
               fullWidth
               size="large"
               variant="contained"
               color={type === 'CHECK_IN' ? 'primary' : 'warning'}
               disabled={!photo || !location || loading}
               onClick={handleSubmit}
            >
               {loading
                  ? 'Mengirim...'
                  : `Kirim ${type === 'CHECK_IN' ? 'Absen Masuk' : 'Absen Pulang'}`}
            </Button>
         </Stack>
      </Card>
   );
}
