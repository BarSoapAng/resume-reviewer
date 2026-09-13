import type { z } from "zod";
import { SourceAnchorSchema } from "./schemas.js";

export type SourceAnchor = z.infer<typeof SourceAnchorSchema>;
