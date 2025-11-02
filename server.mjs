import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// --- CONFIG PATH ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- INITIALISATION EXPRESS ---
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // permet de servir index.html et admin.html

// --- SUPABASE ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- TOKEN TEMPORAIRE ---
const tokens = new Map();

// --- ROUTE SERVEUR DE BASE ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// --- ROUTE LOGIN ADMIN ---
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("🟦 Tentative de connexion :", username, password);

  const { data, error } = await supabase
    .from("admin")
    .select("*")
    .eq("username", username)
    .single();

  console.log("🟩 Données Supabase :", data);

  if (error || !data) {
    console.log("❌ Utilisateur introuvable");
    return res.status(401).json({ error: "Utilisateur introuvable" });
  }

  if (password !== data.password) {
    console.log("❌ Mot de passe incorrect");
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }

  const token = crypto.randomBytes(16).toString("hex");
  tokens.set(token, username);

  console.log("✅ Connexion réussie, token généré :", token);
  res.json({ token });
});

// --- ROUTE PROTÉGÉE INSCRIPTIONS ---
app.get("/inscriptions", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !tokens.has(authHeader)) {
    console.log("❌ Accès refusé - Token manquant ou invalide");
    return res.status(403).json({ error: "Accès refusé" });
  }

  const { data, error } = await supabase.from("inscription").select("*");
  if (error) {
    console.log("⚠️ Erreur Supabase :", error);
    return res.status(500).json({ error: "Erreur Supabase" });
  }

  res.json(data);
});

// --- LANCEMENT DU SERVEUR ---
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
