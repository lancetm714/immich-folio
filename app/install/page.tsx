import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isInstalled, getInstallCredentials } from '@/lib/install';
import { InstallWizard } from './InstallWizard';

export const metadata: Metadata = {
  title: 'Install Immich Folio',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function InstallPage() {
  if (isInstalled()) {
    redirect('/');
  }

  const creds = getInstallCredentials();

  return <InstallWizard initialApiUrl={creds.apiUrl} />;
}
