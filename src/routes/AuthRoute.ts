import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
  sendPasswordResetHandler,
  verifyEmailHandler,
} from "../controllers/AuthController";

const AuthRoutes = Router();

// prefix: /auth
AuthRoutes.post("/register", registerHandler);
AuthRoutes.post("/login", loginHandler);
AuthRoutes.get("/refresh", refreshHandler);
AuthRoutes.get("/logout", logoutHandler);
AuthRoutes.get("/email/verify/:code", verifyEmailHandler);
AuthRoutes.post("/password/forgot", sendPasswordResetHandler);
AuthRoutes.post("/password/reset", resetPasswordHandler);

export default AuthRoutes;
