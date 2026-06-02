/*
  Warnings:

  - You are about to drop the column `culinaryPlaceId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `orders` table. All the data in the column will be lost.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `culinary_places` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `culinary_places` table without a default value. This is not possible if the table is not empty.
  - Added the required column `items` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PriceRange" AS ENUM ('BUDGET', 'MID', 'PREMIUM');

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_menuId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orderId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_culinaryPlaceId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_orderId_fkey";

-- AlterTable
ALTER TABLE "culinary_places" ADD COLUMN     "ambiance" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "mapUrl" TEXT,
ADD COLUMN     "openHours" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "priceRange" "PriceRange",
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "thumbnailImage" TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "culinaryPlaceId",
DROP COLUMN "note",
ADD COLUMN     "items" JSONB NOT NULL,
ADD COLUMN     "paymentMethod" TEXT NOT NULL,
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "transferProofUrl" TEXT,
ALTER COLUMN "totalPrice" SET DATA TYPE DOUBLE PRECISION,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending_payment';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT;

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateIndex
CREATE UNIQUE INDEX "culinary_places_slug_key" ON "culinary_places"("slug");
