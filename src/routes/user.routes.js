import { Router } from "express";
import {
    registerUser,
    googleAuth,
    UsergoogleAuth,
    loginUser,

} from "../Controllers/user.controller.js";

const router = Router()
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/google").post(googleAuth)
router.route("/usergoogle").post(UsergoogleAuth)

export default router