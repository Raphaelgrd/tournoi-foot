// --- IMPORTS ---
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// Gestion du chemin absolu (nécessaire sur Render)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIG ---
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "src"))); // pour servir les fichiers statiques du dossier src

// --- CONNEXION SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // clé de service de Render
const supabase = createClient(supabaseUrl, supabaseKey);

// --- LOG POUR DEBUG ---
console.log("✅ SUPABASE_URL:", supabaseUrl);
console.log("✅ SUPABASE_KEY:", supabaseKey ? "clé détectée" : "❌ manquante");

// --- ROUTE PRINCIPALE (page d'accueil) ---
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "src", "index.html");
  console.log("➡️ Envoi du fichier :", indexPath);
  res.sendFile(indexPath);
});

// --- ROUTE PAGE ADMIN ---
app.get("/admin", (req, res) => {
  const adminPath = path.join(__dirname, "src", "admin.html");
  console.log("➡️ Envoi du fichier :", adminPath);
  res.sendFile(adminPath);
});

// --- ROUTE LOGIN ADMIN ---
const tokens = new Map(); // stockage temporaire des sessions admin

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("🔐 Tentative de connexion :", username);

  const { data, error } = await supabase
    .from("admin")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) {
    console.log("❌ Utilisateur introuvable :", error);
    return res.status(401).json({ error: "Utilisateur introuvable" });
  }

  if (password !== data.password) {
    console.log("⚠️ Mot de passe incorrect");
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }

  const token = crypto.randomBytes(16).toString("hex");
  tokens.set(token, username);
  console.log("✅ Connexion réussie :", username);
  res.json({ token });
});

// --- ROUTE PROTÉGÉE : INSCRIPTIONS ---
app.get("/inscriptions", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !tokens.has(authHeader)) {
    console.log("⛔ Accès refusé - token manquant ou invalide");
    return res.status(403).json({ error: "Accès refusé" });
  }

  const { data, error } = await supabase.from("inscription").select("*");
  if (error) {
    console.error("❌ Erreur Supabase :", error);
    return res.status(500).json({ error: "Erreur Supabase" });
  }

  res.json(data);
});

// --- ROUTE TEST ---
app.get("/test", async (req, res) => {
  try {
    const { data, error } = await supabase.from("admin").select("*").limit(1);
    if (error) throw error;
    res.json({ message: "Connexion Supabase OK ✅", data });
  } catch (err) {
    console.error("Erreur test Supabase :", err);
    res.status(500).json({ error: err.message });
  }
});

// --- LANCEMENT DU SERVEUR ---
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
