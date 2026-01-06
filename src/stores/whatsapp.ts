import { create } from 'zustand';

import { CONFIG } from 'src/global-config';

// Tipe untuk event data dari WebSocket
interface WSMessage {
   type: 'connected' | 'disconnected' | 'qr' | 'timeout' | 'error' | 'reset';
   data?: string;
   message?: string;
}

// Tipe state store
interface WhatsappState {
   ws: WebSocket | null;
   reconnectTimer: NodeJS.Timeout | null;

   qrCode: string;
   isConnected: boolean;
   userPhone: string;
   status: string;
   isConnecting: boolean;

   connectWS: () => void;
   sendAction: (action: string) => boolean;
   connect: () => void;
   disconnect: () => void;
   resetConnection: () => void;
   getStatus: () => void;
   cleanup: () => void;
}

export const useWhatsappStore = create<WhatsappState>((set, get) => ({
   ws: null,
   reconnectTimer: null,

   qrCode: '',
   isConnected: false,
   userPhone: '',
   status: 'Disconnected',
   isConnecting: false,

   connectWS: () => {
      const { ws } = get();

      if (ws && ws.readyState === WebSocket.OPEN) return;

      if (ws) {
         ws.close();
         set({ ws: null });
      }

      const newWs = new WebSocket(CONFIG.wsUrl + '/wa/connection');

      newWs.onopen = () => {
         console.log('WebSocket connected');
         set({ status: 'Connected to server' });

         setTimeout(() => {
            get().sendAction('status');
         }, 100);
      };

      newWs.onmessage = (event: MessageEvent) => {
         try {
            const data: WSMessage = JSON.parse(event.data);

            switch (data.type) {
               case 'connected':
                  set({
                     isConnected: true,
                     userPhone: data.data || '',
                     qrCode: '',
                     status: 'Connected',
                     isConnecting: false,
                  });
                  break;
               case 'disconnected':
                  set({
                     isConnected: false,
                     userPhone: '',
                     qrCode: '',
                     status: 'Disconnected',
                     isConnecting: false,
                  });
                  break;
               case 'qr':
                  console.log('QR Code data:', data.data);
                  set({
                     isConnected: false,
                     userPhone: '',
                     qrCode: data.data || '',
                     status: 'Scan QR Code',
                     isConnecting: false,
                  });
                  break;
               case 'timeout':
                  set({
                     isConnected: false,
                     userPhone: '',
                     qrCode: '',
                     status: 'Connection timeout',
                     isConnecting: false,
                  });
                  break;
               case 'error':
                  set({
                     isConnected: false,
                     userPhone: '',
                     qrCode: '',
                     status: data.message || 'Error occurred',
                     isConnecting: false,
                  });
                  break;
               case 'reset':
                  set({
                     isConnected: false,
                     userPhone: '',
                     qrCode: '',
                     status: 'Reset completed',
                     isConnecting: false,
                  });
                  break;
               default:
                  console.warn('Unhandled WebSocket message type:', data.type, data);
                  break;
            }
         } catch (error) {
            console.error('Error parsing message:', error);
         }
      };

      newWs.onclose = (event: CloseEvent) => {
         console.log('WebSocket closed', event.code, event.reason);
         set({
            isConnected: false,
            userPhone: '',
            qrCode: '',
            status: 'Connection closed',
            isConnecting: false,
         });
      };

      newWs.onerror = (err: Event) => {
         console.error('WebSocket error:', err);
         set({ status: 'Connection error', isConnecting: false });
      };

      set({ ws: newWs });
   },

   sendAction: (action: string) => {
      const { ws } = get();
      if (ws && ws.readyState === WebSocket.OPEN) {
         try {
            ws.send(JSON.stringify({ action }));
            return true;
         } catch (error) {
            console.error('Error sending action:', error);
            return false;
         }
      }
      return false;
   },

   connect: () => {
      const { isConnecting, isConnected, connectWS, sendAction } = get();

      if (isConnecting || isConnected) return;

      set({ isConnecting: true, status: 'Connecting...' });

      const ws = get().ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
         connectWS();
         setTimeout(() => {
            if (!get().sendAction('connect')) {
               set({ status: 'WebSocket not ready', isConnecting: false });
            }
         }, 500);
      } else {
         if (!sendAction('connect')) {
            set({ status: 'WebSocket not ready', isConnecting: false });
         }
      }
   },

   disconnect: () => {
      const { isConnected, isConnecting, reconnectTimer, sendAction } = get();

      if (!isConnected && !isConnecting) return;

      if (reconnectTimer) {
         clearTimeout(reconnectTimer);
         set({ reconnectTimer: null });
      }

      set({ status: 'Disconnecting...' });

      if (!sendAction('disconnect')) {
         set({
            isConnected: false,
            userPhone: '',
            qrCode: '',
            status: 'Disconnected',
            isConnecting: false,
         });
      }
   },

   resetConnection: () => {
      const { reconnectTimer, sendAction, connectWS } = get();

      if (reconnectTimer) {
         clearTimeout(reconnectTimer);
         set({ reconnectTimer: null });
      }

      set({
         isConnected: false,
         userPhone: '',
         qrCode: '',
         isConnecting: false,
         status: 'Resetting...',
      });

      if (!sendAction('reset')) {
         set({ status: 'WebSocket not ready' });
         setTimeout(() => {
            connectWS();
         }, 1000);
      }
   },

   getStatus: () => {
      if (!get().sendAction('status')) {
         set({ status: 'WebSocket not ready' });
      }
   },

   cleanup: () => {
      const { reconnectTimer, ws } = get();

      if (reconnectTimer) {
         clearTimeout(reconnectTimer);
         set({ reconnectTimer: null });
      }

      if (ws) {
         ws.onclose = null;
         ws.onerror = null;
         ws.onmessage = null;
         ws.onopen = null;

         ws.close(1000, 'Component unmounted');
         set({ ws: null });
      }
   },
}));
