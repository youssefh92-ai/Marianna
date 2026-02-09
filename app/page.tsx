import fs from 'fs';
import path from 'path';
import ClientShell from './client-shell';

async function getPhotoList(): Promise<string[]> {
  const photosDir = path.join(process.cwd(), 'public', 'photos');
  try {
    const files = await fs.promises.readdir(photosDir);
    return files
      .filter((file) => /\.(png|jpe?g|webp|avif|gif)$/i.test(file))
      .map((file) => `/photos/${file}`);
  } catch {
    return [];
  }
}

export default async function Page() {
  const photos = await getPhotoList();
  return <ClientShell photos={photos} />;
}
