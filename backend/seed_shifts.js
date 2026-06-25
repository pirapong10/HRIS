const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INIT_SHIFTS = [
  { id: 1, name: "กะเช้า (08:00 - 17:00)", color: "#3B82F6", startTime: "08:00", endTime: "17:00", days: "1,2,3,4,5" },
  { id: 2, name: "กะบ่าย (13:00 - 22:00)", color: "#F59E0B", startTime: "13:00", endTime: "22:00", days: "1,2,3,4,5" },
  { id: 3, name: "กะดึก (22:00 - 07:00)", color: "#8B5CF6", startTime: "22:00", endTime: "07:00", days: "1,2,3,4,5" },
];

async function main() {
  console.log("Seeding Shifts...");
  for (const shift of INIT_SHIFTS) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {},
      create: shift,
    });
  }
  console.log("Shifts seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
