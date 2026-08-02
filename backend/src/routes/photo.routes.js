import express from "express";
import auth from "../middleware/auth.middleware.js";
import { getPhotos, syncPhotos, searchPhotos } from "../controllers/photo.controller.js";

const router = express.Router();

router.post("/", auth, getPhotos);
router.get("/", auth, getPhotos);
router.post("/sync", auth, syncPhotos);
router.get("/search", auth, searchPhotos);

export default router;
