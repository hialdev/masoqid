"use client"

import Image from "next/image";
import { useEffect } from "react";

import { Box, Card, Button, Typography } from "@mui/material";

import { paths } from "src/routes/al/paths";

import { useWhatsappStore } from "src/stores/whatsapp";
import CheckInIllustration from "src/assets/illustrations/check-in-illustration";
import ComingSoonIllustration from "src/assets/illustrations/coming-soon-illustration";

import { CustomBreadcrumbs } from "src/components/custom-breadcrumbs";

export default function WhatsappView() {
   const {
      qrCode,
      isConnected,
      isConnecting,
      userPhone,
      status,
      connect,
      disconnect,
      resetConnection,
      getStatus,
      connectWS,
      cleanup,
   } = useWhatsappStore();

   useEffect(() => {
      connectWS();
      return () => cleanup();
   }, []);

   return (
      <>
         <CustomBreadcrumbs
            heading="Whatsapp Integration"
            links={[
               { name: "Dashboard", href: paths.dashboard.root },
               { name: "Whatsapp Integration" },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Box sx={{display:'flex', flexDirection:'column', alignItems:'center', flex: 1, width: '100%', gap:3}}>
            {/* Left: QR / Illustration */}
            {qrCode ? (
               <Card>
                  <Image
                     src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        qrCode
                     )}`}
                     width={250}
                     height={250}
                     alt="QR Code"
                  />
               </Card>
            ) : (
               <>
                  {!isConnected && !isConnecting ? (
                     <ComingSoonIllustration width={500} scale={2} />
                  ) : (
                     <CheckInIllustration width={500} scale={2} />
                  )}
               </>
            )}

            {/* Right: Connection status + actions */}
            <Box sx={{position:'sticky', bottom:0}}>
               <Card sx={{padding:3, mb:4, display:'flex', alignItems:'center', flexDirection:'column'}}>
                  <Box sx={{textAlign:'center', mb:2}}>
                     {isConnected ? (
                        <>
                           <Typography >
                              Connected
                           </Typography>
                           <Typography typography="h3">+{userPhone}</Typography>
                        </>
                     ) : (
                        <Typography>
                           Not Connected
                        </Typography>
                     )}
                     <Typography>
                        Status: {status}
                     </Typography>
                  </Box>


                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                     <Button
                        onClick={
                           isConnected || isConnecting ? undefined : connect
                        }
                        disabled={isConnected || isConnecting}
                        variant="contained"
                        color="primary"
                        loading={isConnecting}
                     >
                        Connect
                     </Button>

                     <Button
                        onClick={
                           !isConnected && !isConnecting
                              ? undefined
                              : disconnect
                        }
                        disabled={!isConnected && !isConnecting}
                        variant="contained"
                        color="error"
                     >
                        Disconnect
                     </Button>

                     <Button
                        onClick={resetConnection}
                        variant="soft"
                        color="info"
                     >
                        Reset
                     </Button>

                     <Button
                        onClick={getStatus}
                        variant="outlined"
                     >
                        Status
                     </Button>
                  </Box>
               </Card>
            </Box>
         </Box>
      </>
   );
}
