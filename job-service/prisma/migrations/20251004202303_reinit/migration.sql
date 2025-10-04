-- CreateEnum
CREATE TYPE "Status" AS ENUM ('QUEUED', 'INPROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('reverse_string', 'uppercase_text', 'capitalise_text', 'fibbonaci_cal');

-- CreateTable
CREATE TABLE "Jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'QUEUED',
    "userId" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jobs_pkey" PRIMARY KEY ("id")
);
