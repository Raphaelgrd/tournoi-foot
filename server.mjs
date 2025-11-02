import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Connexion à Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --- Route d'inscription joueurs ---
app.post("/register", async (req, res) => {
  const { nom, prenom, age, email } = req.body;

  if (!nom || !prenom || !age || !email) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const { error } = await supabase.from("inscription").insert([{ nom, prenom, age, email }]);
  if (error) {
    console.error("Erreur Supabase :", error);
    return res.status(500).json({ error: "Erreur lors de l'inscription" });
  }

  res.status(200).json({ message: "Inscription réussie ✅" });
});

// --- Authentification admin simple ---
let adminToken = null;

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("📩 Données reçues :", username, password);

  // Vérifie dans la table admin
  const { data, error } = await supabase
    .from("admin")
    .select("*")
    .eq("username", username)
    .single();

  console.log("🗂️ Résultat Supabase :", data, error);

  if (error || !data) {
    return res.status(401).json({ error: "Identifiant incorrect" });
  }

  // Vérifie mot de passe
  if (password.trim() !== data.password.trim()) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }

  // Génère un token basique (pas besoin de crypto pour ce test)
  adminToken = Math.random().toString(36).substring(2);
  console.log("✅ Connexion réussie, token :", adminToken);
  res.json({ token: adminToken });
});

// --- Route protégée pour afficher les inscriptions ---
app.get("/inscriptions", async (req, res) => {
  const token = req.headers.authorization;
  if (token !== adminToken) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  const { data, error } = await supabase.from("inscription").select("*");
  if (error) {
    console.error("Erreur Supabase :", error);
    return res.status(500).json({ error: "Erreur lors du chargement des données" });
  }

  res.json(data);
});

// --- Middleware de debug ---
app.use((req, res, next) => {
  console.log("➡️ Nouvelle requête :", req.method, req.url);
  next();
});

// --- Lancement du serveur ---
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
