import { Router } from "express";

import {
  createServiceCatalogController,
  getServiceCatalogsController,
  getServiceCatalogByIdController,
  updateServiceCatalogController,
  deleteServiceCatalogController,
} from "./serviceCatalog.controller";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// GET ALL SERVICE CATALOG ITEMS
// ==========================================

router.get(
  "/",
  authenticate,
  getServiceCatalogsController
);

// ==========================================
// GET SERVICE CATALOG ITEM BY ID
// ==========================================

router.get(
  "/:id",
  authenticate,
  getServiceCatalogByIdController
);

// ==========================================
// CREATE SERVICE CATALOG ITEM
// ADMIN ONLY
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createServiceCatalogController
);

// ==========================================
// UPDATE SERVICE CATALOG ITEM
// ADMIN ONLY
// ==========================================

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateServiceCatalogController
);

// ==========================================
// DELETE SERVICE CATALOG ITEM
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteServiceCatalogController
);

export default router;