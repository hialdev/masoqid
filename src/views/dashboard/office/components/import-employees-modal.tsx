import type { FC } from 'react';
import { useState, useCallback } from 'react';
import {
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   Button,
   Box,
   Typography,
   LinearProgress,
   Alert,
   List,
   ListItem,
   ListItemText,
   Chip,
   Stack,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { Iconify } from 'src/components/iconify';
import { toast } from 'sonner';
import { CONFIG } from 'src/global-config';
import { protectedApi } from 'src/lib/al/axios';

// ----------------------------------------------------------------------

type ImportEmployeesModalProps = {
   open: boolean;
   onClose: () => void;
   officeId: string;
   officeName: string;
   onSuccess?: () => void;
};

type ImportResult = {
   total: number;
   success: number;
   failed: number;
   errors?: Array<{
      row: number;
      error: string;
      name?: string;
      username?: string;
   }>;
};

export const ImportEmployeesModal: FC<ImportEmployeesModalProps> = ({
   open,
   onClose,
   officeId,
   officeName,
   onSuccess,
}) => {
   const [file, setFile] = useState<File | null>(null);
   const [uploading, setUploading] = useState(false);
   const [progress, setProgress] = useState(0);
   const [result, setResult] = useState<ImportResult | null>(null);
   const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');

   const onDrop = useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
         const selectedFile = acceptedFiles[0];

         // Validate file size (max 20MB)
         if (selectedFile.size > 20 * 1024 * 1024) {
            toast.error('Ukuran file melebihi 20MB');
            return;
         }

         // Validate file type
         const ext = selectedFile.name.split('.').pop()?.toLowerCase();
         if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
            toast.error('Format file harus XLS atau CSV');
            return;
         }

         setFile(selectedFile);
         setResult(null);
      }
   }, []);

   const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: {
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
         'application/vnd.ms-excel': ['.xls'],
         'text/csv': ['.csv'],
      },
      maxFiles: 1,
   });

   const handleUpload = async () => {
      if (!file) return;

      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('duplicate_strategy', duplicateStrategy);

      try {
         // Simulate progress
         const progressInterval = setInterval(() => {
            setProgress((prev) => {
               if (prev >= 90) {
                  clearInterval(progressInterval);
                  return 90;
               }
               return prev + 10;
            });
         }, 200);

         const response = await protectedApi.post(
            `/offices/${officeId}/import-employees`,
            formData,
            {
               headers: {
                  'Content-Type': 'multipart/form-data',
               },
            }
         );

         clearInterval(progressInterval);
         setProgress(100);

         const data = response.data;

         if (data.success) {
            setResult(data.data);
            toast.success(`Import berhasil! ${data.data.success} dari ${data.data.total} karyawan`);

            if (onSuccess) {
               setTimeout(() => {
                  onSuccess();
               }, 2000);
            }
         } else {
            toast.error(data.message || 'Import gagal');
         }
      } catch (error: any) {
         console.error('Import error:', error);
         toast.error(error.message || 'Gagal mengupload file');
      } finally {
         setUploading(false);
      }
   };

   const handleClose = () => {
      if (!uploading) {
         setFile(null);
         setResult(null);
         setProgress(0);
         setDuplicateStrategy('skip');
         onClose();
      }
   };

   const downloadTemplate = () => {
      const csvContent =
         'name,username,email,phone,country_code,role_id\nJohn Doe,johndoe,john@example.com,081234567890,ID,\n';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-import-employees.csv';
      a.click();
      window.URL.revokeObjectURL(url);
   };

   return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
         <DialogTitle>Import Karyawan ke {officeName}</DialogTitle>

         <DialogContent>
            <Stack spacing={3}>
               {/* Template Download */}
               <Alert
                  severity="info"
                  action={
                     <Button size="small" onClick={downloadTemplate}>
                        Download
                     </Button>
                  }
               >
                  Download template CSV untuk format yang benar
               </Alert>

               {/* Format Info */}
               <Box>
                  <Typography variant="subtitle2" gutterBottom>
                     Format File:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     • Kolom wajib: <strong>name, username</strong>
                     <br />• Wajib isi minimal satu: <strong>email</strong> atau{' '}
                     <strong>phone</strong>
                     <br />
                     • Kolom opsional: country_code (default: ID), role_id
                     <br />• Format: XLS, XLSX, atau CSV (Max 20MB)
                  </Typography>
               </Box>

               {/* Duplicate Strategy */}
               <Box>
                  <Typography variant="subtitle2" gutterBottom>
                     Jika data kembar (Username/Email/Phone):
                  </Typography>
                  <Stack direction="row" spacing={2}>
                     <Button
                        variant={duplicateStrategy === 'skip' ? 'contained' : 'outlined'}
                        onClick={() => setDuplicateStrategy('skip')}
                        color="inherit"
                     >
                        Skip (Lewati)
                     </Button>
                     <Button
                        variant={duplicateStrategy === 'update' ? 'contained' : 'outlined'}
                        onClick={() => setDuplicateStrategy('update')}
                        color="inherit"
                     >
                        Update (Timpah)
                     </Button>
                  </Stack>
                  <Typography
                     variant="caption"
                     color="text.secondary"
                     sx={{ mt: 1, display: 'block' }}
                  >
                     {duplicateStrategy === 'skip'
                        ? 'Data yang sudah ada tidak akan diubah.'
                        : 'Data yang sudah ada akan diperbarui dengan data baru dari file.'}
                  </Typography>
               </Box>

               {/* File Upload */}
               {!result && (
                  <Box
                     {...getRootProps()}
                     sx={{
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: isDragActive ? 'action.hover' : 'background.neutral',
                        transition: 'all 0.3s',
                        '&:hover': {
                           borderColor: 'primary.main',
                           bgcolor: 'action.hover',
                        },
                     }}
                  >
                     <input {...getInputProps()} />
                     <Iconify
                        icon="eva:cloud-upload-fill"
                        width={48}
                        sx={{ mb: 2, color: 'text.secondary' }}
                     />
                     <Typography variant="h6" gutterBottom>
                        {file ? file.name : 'Drop file atau klik untuk upload'}
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        {file
                           ? `Ukuran: ${(file.size / 1024 / 1024).toFixed(2)} MB`
                           : 'XLS, XLSX, atau CSV (max 20MB)'}
                     </Typography>
                  </Box>
               )}

               {/* Progress Bar */}
               {uploading && (
                  <Box>
                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                           <LinearProgress variant="determinate" value={progress} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                           {progress}%
                        </Typography>
                     </Box>
                     <Typography variant="caption" color="text.secondary">
                        Processing... {progress < 100 ? `${progress}%` : 'Finishing up...'}
                     </Typography>
                  </Box>
               )}

               {/* Result */}
               {result && (
                  <Box>
                     <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <Chip label={`Total: ${result.total}`} color="default" />
                        <Chip label={`Berhasil: ${result.success}`} color="success" />
                        {result.failed > 0 && (
                           <Chip label={`Gagal: ${result.failed}`} color="error" />
                        )}
                     </Stack>

                     {result.errors && result.errors.length > 0 && (
                        <Box>
                           <Typography variant="subtitle2" color="error" gutterBottom>
                              Error Details:
                           </Typography>
                           <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                              {result.errors.map((err, index) => (
                                 <ListItem key={index}>
                                    <ListItemText
                                       primary={`Baris ${err.row}: ${err.error}`}
                                       secondary={
                                          err.username ? `Username: ${err.username}` : undefined
                                       }
                                    />
                                 </ListItem>
                              ))}
                           </List>
                        </Box>
                     )}
                  </Box>
               )}
            </Stack>
         </DialogContent>

         <DialogActions>
            <Button onClick={handleClose} disabled={uploading}>
               {result ? 'Tutup' : 'Batal'}
            </Button>
            {!result && (
               <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  startIcon={<Iconify icon="eva:upload-fill" />}
               >
                  {uploading ? 'Uploading...' : 'Upload'}
               </Button>
            )}
         </DialogActions>
      </Dialog>
   );
};
