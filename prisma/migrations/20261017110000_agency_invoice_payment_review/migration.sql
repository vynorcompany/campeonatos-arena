ALTER TABLE "AgencyInvoice"
  ADD COLUMN "paymentReviewStatus" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "paymentReviewAt" TIMESTAMP(3);
