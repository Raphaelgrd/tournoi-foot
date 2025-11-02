// --- IMPORTS ---
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// Gestion du chemin absolu
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIG ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// --- CONNEXION SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // correspond à ta variable Render
const supabase = createClient(supabaseUrl, supabaseKey);

// Log pour vérifier les variables en prod
console.log("✅ SUPABASE_URL:", supabaseUrl);
console.log("✅ SUPABASE_KEY:", supabaseKey ? "clé détectée" : "❌ manquante");

// --- ROUTE D'ACCUEIL ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- ROUTE PAGE ADMIN ---
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// --- ROUTE LOGIN ADMIN ---
const tokens = new Map(); // stockage temporaire des sessions

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("🔐 Tentative de connexion :", username, password);

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
    return res.status(403).json({ error: "Accès refusé" });
  }

  const { data, error } = await supabase.from("inscription").select("*");
  if (error) {
    console.error("Erreur Supabase :", error);
    return res.status(500).json({ error: "Erreur Supabase" });
  }

  res.json(data);
});

// --- LANCEMENT DU SERVEUR ---
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
