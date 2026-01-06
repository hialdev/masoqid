import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';

import { fDateTime } from 'src/utils/format-time';
import { Label } from 'src/components/label';
import { Image } from 'src/components/image';
import { Attendance } from 'src/stores/attendance-store';
import LocationCell from './location-cell';
import { Fragment } from 'react';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   attendance: Attendance | null;
};

export default function AttendanceDetailDialog({ open, onClose, attendance }: Props) {
   if (!attendance) return null;

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>Attendance Details</DialogTitle>

         <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
               <Stack spacing={2} alignItems="center">
                  <Box sx={{ p: 1, border: '1px dashed grey', borderRadius: 1 }}>
                     <Image
                        alt="Check-in Photo"
                        src={
                           attendance.photo_url
                              ? process.env.NEXT_PUBLIC_API_HOST + '/' + attendance.photo_url
                              : '/assets/placeholder-image.png'
                        }
                        sx={{
                           width: 320,
                           height: 320,
                           borderRadius: 1,
                           objectFit: 'cover',
                        }}
                        ratio="1/1"
                     />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                     {fDateTime(attendance.attendance_time)}
                  </Typography>
                  <Label
                     color={
                        attendance.status === 'VALID'
                           ? 'success'
                           : attendance.status === 'SUSPICIOUS'
                             ? 'warning'
                             : 'error'
                     }
                  >
                     {attendance.status}
                  </Label>
               </Stack>

               <Divider />

               <Stack spacing={1}>
                  <Typography variant="subtitle2">Location</Typography>
                  <LocationCell
                     lat={attendance.latitude}
                     lng={attendance.longitude}
                     accuracy={attendance.location_accuracy}
                  />
               </Stack>

               {attendance.suspicious_logs && attendance.suspicious_logs.length > 0 && (
                  <>
                     <Divider />
                     <Stack spacing={1}>
                        <Typography variant="subtitle2" color="error.main">
                           Suspicious Logs (Score: {attendance.suspicious_score})
                        </Typography>
                        {attendance.suspicious_logs.map((log) => (
                           <Fragment key={log.id}>
                              <Box
                                 sx={{
                                    p: 1,
                                    px: 2,
                                    borderRadius: 1,
                                    bgcolor: 'background.neutral',
                                 }}
                              >
                                 <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {log.rule_code}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {log.rule_description}
                                 </Typography>
                              </Box>
                           </Fragment>
                        ))}
                     </Stack>
                  </>
               )}
            </Stack>
         </DialogContent>

         <DialogActions>
            <Button onClick={onClose} variant="contained" color="inherit">
               Close
            </Button>
         </DialogActions>
      </Dialog>
   );
}
