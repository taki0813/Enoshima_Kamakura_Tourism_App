import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
const envLocal = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal })
} else {
  dotenv.config()
}
import { PrismaClient } from '@prisma/client';
import { touristSpots } from './tourist-spots-data'; // 新しいファイルからインポート
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);
  // admin user
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: 'admin' },
      create: { email: adminEmail, passwordHash, role: 'admin', name: 'Admin' },
    })
    console.log(`Upserted admin user: ${adminEmail}`)
  } else {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not provided. Skipping admin user seed.')
  }
  for (const spot of touristSpots) {
    const spotData = await prisma.touristSpot.upsert({
      where: { id: spot.id },
      update: {},
      create: {
        id: spot.id,
        name: spot.name,
        description: spot.description,
        area: spot.area,
        category: spot.category,
        tags: JSON.stringify(spot.tags), // 配列をJSON文字列に変換
        duration: spot.duration,
        difficulty: spot.difficulty,
        lat: spot.coordinates.lat,
        lng: spot.coordinates.lng,
        openHours: spot.openHours,
        entranceFee: spot.entrance_fee,
        image: spot.image,
        tips: JSON.stringify(spot.tips), // 配列をJSON文字列に変換
      },
    });
    console.log(`Created spot with id: ${spotData.id}`);
  }
  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });