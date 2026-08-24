ALTER TABLE "Arena"
  ADD COLUMN "onlineBookingLayout" TEXT NOT NULL DEFAULT 'BLOCKS',
  ADD COLUMN "onlineBookingRequiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "onlineBookingShowReserved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "onlineBookingPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "onlineBookingWhatsappMessage" TEXT NOT NULL DEFAULT '';
