import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { router } from "./presentation/routes/index.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use("/", router);

export default app;
