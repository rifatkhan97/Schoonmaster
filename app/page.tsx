import StorePage, { metadata as storeMetadata } from './store/page';

export const dynamic = 'force-dynamic';
export const metadata = storeMetadata;

export default async function HomePage() {
  return <StorePage />;
}
