import { Router } from "express";
import ReissueController from "../controllers/reissue.controller";

const router = Router();

// Auto Reissue, in order: query-list -> search -> review -> book.
router.post("/search-query", ReissueController.searchQuery);
router.post("/search", ReissueController.search);
router.post("/review", ReissueController.review);
router.post("/book", ReissueController.book);

export default router;
