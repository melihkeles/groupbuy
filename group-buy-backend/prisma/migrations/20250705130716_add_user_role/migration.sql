/*
  Warnings:

  - You are about to drop the column `card` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `cvc` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `exp` on the `Participant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "card",
DROP COLUMN "cvc",
DROP COLUMN "exp";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';
