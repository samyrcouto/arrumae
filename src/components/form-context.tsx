"use client";

import { createContext } from "react";
import type { ActionResult } from "@/lib/action-result";

export const FormCtx = createContext<ActionResult>(null);
export const FormContextProvider = FormCtx;
