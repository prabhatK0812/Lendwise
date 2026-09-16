/* ──────────────────────────────────────────────────────────────
 *  loanRoutes.ts — /api/loans/* route definitions + RBAC
 *
 *  Every route runs authenticate() first. Role restrictions
 *  are applied per-endpoint via authorize(...roles) so the
 *  backend enforces RBAC regardless of frontend behaviour.
 * ────────────────────────────────────────────────────────────── */

import { Router } from "express";
import { authenticate, authorize } from "../middleware";
import { salarySlipUpload } from "../middleware/upload";
import * as controller from "../controllers/loanController";

const router = Router();

// Routes declare transport concerns only; business logic lives in controllers and services.
router.post(
  "/eligibility",
  authenticate,
  authorize("Borrower"),
  controller.checkEligibility,
);
router.post(
  "/",
  authenticate,
  authorize("Borrower"),
  salarySlipUpload.single("salarySlip"),
  controller.create,
);
router.get("/mine", authenticate, authorize("Borrower"), controller.mine);
router.get(
  "/leads",
  authenticate,
  authorize("Admin", "Sales"),
  controller.leads,
);
router.get(
  "/dashboard",
  authenticate,
  authorize("Admin", "Sales", "Sanction", "Disbursement", "Collection"),
  controller.dashboard,
);
router.patch(
  "/:id/sanction",
  authenticate,
  authorize("Admin", "Sanction"),
  controller.sanction,
);
router.patch(
  "/:id/disburse",
  authenticate,
  authorize("Admin", "Disbursement"),
  controller.disburse,
);
router.post(
  "/:id/payments",
  authenticate,
  authorize("Admin", "Collection"),
  controller.payment,
);
router.get(
  "/:id/document",
  authenticate,
  authorize("Admin", "Sanction", "Disbursement", "Collection", "Borrower"),
  controller.getDocument,
);

export { router as loanRouter };
