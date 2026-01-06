"use client"

import { toast } from "sonner";
import { useState, useEffect } from "react";
import { varAlpha } from "minimal-shared/utils";
import { useBoolean } from "minimal-shared/hooks";

import { Box, Card, Chip, Button, Tooltip, useTheme, Typography, CardContent } from "@mui/material";

import { paths } from "src/routes/al/paths";

import useRoleStore from "src/stores/role";
import usePermissionStore from "src/stores/permission";
import { DashboardContent } from "src/layouts/dashboard";
import { PageNotFoundIllustration } from "src/assets/illustrations";

import { Iconify } from "src/components/iconify";
import { ConfirmDialog } from "src/components/custom-dialog";
import { CustomBreadcrumbs } from "src/components/custom-breadcrumbs";

import AccessItem from "../components/access-item";
import { AccessCUForm } from "../forms/access-cu-form";
import { PermissionCUForm } from "../forms/permission-cu-form";

export default function AccessView() {

   const theme = useTheme()
   const addDialog = useBoolean()
   const addPermissionDialog = useBoolean()
   const [selectedPermission, setSelectedPermission] = useState<any>(undefined)
   const confirmDialog = useBoolean()
   const color = 'primary'
   const { all: getRoles, roles } = useRoleStore();
   const { all: getPermissions, permissions, delete: destroy } = usePermissionStore();
   // -----------------------------------------------------------------------------------------
   const handleActionSuccess = async () => {
      addDialog.onFalse()
      await fetchData()
   }

   const handlePermissionActionSuccess = async () => {
      addPermissionDialog.onFalse()
      await fetchData()
   }

   const handleDeletePermission = async () => {
      confirmDialog.onFalse()
      const reqDel = await destroy({id: selectedPermission.id})
      if (reqDel.success){
         toast.success("Berhasil menghapus permission " + selectedPermission?.name)
         fetchData()
      }else{
         toast.error(reqDel.message.message)
      }
      setSelectedPermission(undefined)
   }

   const fetchData = async () => {
      await getRoles()
      await getPermissions()
   }
   // -----------------------------------------------------------------------------------------

   useEffect(() => {
      fetchData()
   }, [])

   // -----------------------------------------------------------------------------------------

   const renderAdd = () => (
      <AccessCUForm
         open={addDialog.value}
         onSuccess={handleActionSuccess}
         onClose={addDialog.onFalse}
      />
   );

   const renderPermissionAdd = () => (
      <PermissionCUForm
         open={addPermissionDialog.value}
         onSuccess={handlePermissionActionSuccess}
         onClose={addPermissionDialog.onFalse}
      />
   );

   const renderConfirmPermissionDialog = () => (
      <ConfirmDialog
         open={confirmDialog.value}
         onClose={confirmDialog.onFalse}
         title="Delete"
         content={`Are you sure want to delete Permission "${selectedPermission?.name}"?`}
         action={
            <Button variant="contained" color="error" onClick={handleDeletePermission}>
               Delete
            </Button>
         }
      />
   );
   // -----------------------------------------------------------------------------------------

   return (
      <DashboardContent>
            <CustomBreadcrumbs
               heading="Access Control"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'User', href: paths.dashboard.user.root },
                  { name: 'Access Control' },
               ]}
               action={
                  <Button
                     onClick={addDialog.onTrue}
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                     Add Access
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            {renderAdd()}

            <Box>
               <Card
                  sx={{
                     boxShadow: 'none',
                     position: 'relative',
                     color: `${color}.darker`,
                     backgroundColor: 'common.white',
                     backgroundImage: `linear-gradient(135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)})`,
                  }}
               >
                  <CardContent>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography typography="h6">Permissions</Typography>
                        <Button
                           onClick={addPermissionDialog.onTrue}
                           variant="contained"
                           size="small"
                        >
                           <Iconify icon="mingcute:add-line" />
                        </Button>
                     </Box>
                     <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        {permissions.length > 0 ? (
                           <>
                              {permissions.map((permission: any, i: number) => (
                                 <Tooltip key={i} title={permission.description} placement="bottom" arrow>
                                    <Chip label={permission.name} sx={{color:'#212121'}} onDelete={() => { confirmDialog.onTrue(); setSelectedPermission(permission) }} />
                                 </Tooltip>
                              ))}
                           </>
                        ) : (
                           <Typography color="primary">Tidak ada data permission, silahkan tambah dengan klik tombol &quot;+&quot; di atas</Typography>
                        )}
                     </Box>
                  </CardContent>
               </Card>

               {renderPermissionAdd()}
               {renderConfirmPermissionDialog()}
            </Box>

            <Typography sx={{ my: 2 }} typography="h6">Roles</Typography>

            {roles.length > 0 ? (
               <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `1fr 1fr` }, gap: 2 }}>
                     {roles.map((role, i) => (
                        <AccessItem key={i} role={role} onSuccess={handleActionSuccess} />
                     ))}
                  </Box>
            ) : (
               <Box display="flex" flexDirection="column" alignItems="center" width="100%" gap={3} paddingY={3}>
                     <PageNotFoundIllustration />
                     <Box textAlign="center">
                        <Typography typography="h6">Tidak ada data roles yang ditemukan</Typography>
                        <Typography color="primary">Silahkan tambah baru access</Typography>
                     </Box>
                  </Box>
            )}
         </DashboardContent>
   )
}