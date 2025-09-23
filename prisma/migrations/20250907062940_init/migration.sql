-- CreateTable
CREATE TABLE "TouristSpot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "openHours" TEXT NOT NULL,
    "entranceFee" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "tips" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "couponId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount" TEXT NOT NULL,
    "validUntil" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "spotName" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL,
    "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" DATETIME,
    "category" TEXT NOT NULL,
    "isInstant" BOOLEAN,
    CONSTRAINT "Coupon_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "TouristSpot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
