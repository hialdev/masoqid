// src/app/(auth)/al/refresh/page.tsx
import { redirect } from 'next/navigation';

export default function RefreshPage() {
   redirect('/api/auth/refresh');
}