import {
  fromClerkAuth
} from "./chunk-HWIZ2Q5U.mjs";
import "./chunk-5WLTDLEP.mjs";

// src/next.ts
import { auth } from "@clerk/nextjs";
function getSession() {
  const clerkAuth = auth();
  return fromClerkAuth(clerkAuth);
}
export {
  getSession
};
