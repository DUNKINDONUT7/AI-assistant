import { createApp } from "../server/app.js";

// Vercel maps every /api/* request to this Express application.
// Do not call listen() here: Vercel owns the server lifecycle.
export default createApp();
