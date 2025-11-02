// --- Import des modules ---
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

// --- Configuration ---
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// --- Pour servir les fichiers HTML ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // sert index.html, admin.html etc.

// --- Connexion à Supabase ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Route principale : renvoie le formulaire ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Route admin : renvoie la page admin ---
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// --- ROUTE INSCRIPTION TOURNOI ---
app.post("/inscription", async (req, res) => {
  try {
    const { nom, prenom, age, email } = req.body;

    const { data, error } = await supabase
      .from("inscriptions")
      .insert([{ nom, prenom, age, email }]);

    if (error) throw error;

    res.status(200).json({ message: "Inscription réussie !" });
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
});

// --- GESTION DU LOGIN ADMIN ---
const tokens = new Map(); // stockage temporaire des sessions

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Tentative de connexion :", username, password);

  try {
    const { data, error } = await supabase
      .from("admin")
      .select("*")
      .eq("username", username)
      .single();

    console.log("Données Supabase :", data);

    if (error || !data) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    if (password !== data.password) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    tokens.set(token, username);

    res.json({ token });
  } catch (err) {
    console.error("Erreur lors du login :", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// --- ROUTE PROTÉGÉE : affichage des inscriptions ---
app.get("/inscriptions", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !tokens.has(authHeader)) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  const { data, error } = await supabase.from("inscriptions").select("*");
  if (error) return res.status(500).json({ error: "Erreur Supabase" });

  res.json(data);
});

// --- Lancement du serveur ---
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
