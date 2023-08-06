const express = require("express");
const axios = require("axios");
const uid2 = require("uid2");
const apiKey = process.env.API_KEY;

const { SHA256, encBase64 } = require("crypto-js");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  newsletter: { type: Boolean, default: false },
  salt: { type: String },
  token: { type: String },
  favorisPersonnages: [{ type: String, ref: "Personnage" }],
  favorisComics: [{ type: String, ref: "Comic" }],
});

const User = mongoose.model("User", UserSchema);
const generateToken = (userId, email) => {
  const secretKey = process.env.SECRET_KEY;
  const token = SHA256(userId + email + secretKey).toString(encBase64);
  return token;
};

const router = express.Router();
///////////////////////       HP du projet    ///////////////////////////////////////////////
router.get("/", async (req, res) => {
  try {
    return res.status(200).json("bienvenue sur le serveur Marvel");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
///////////////////////       Characters    ///////////////////////////////////////////////

router.get("/characters", async (req, res) => {
  console.log(req.query);

  try {
    const name = req.query.name || ""; // Récupérer le paramètre "name" de la requête, s'il n'est pas fourni, utilisez une chaîne vide
    const limit = parseInt(req.query.limit) || 8; // Récupérer le paramètre "limit" de la requête, s'il n'est pas fourni, utilisez 10 (valeur par défaut)
    const skip = parseInt(req.query.skip) || 0; // Récupérer le paramètre "skip" de la requête, s'il n'est pas fourni, utilisez 0 (valeur par défaut)

    const apiUrl = `https://lereacteur-marvel-api.herokuapp.com/characters?apiKey=${apiKey}&name=${name}&limit=${limit}&skip=${skip}`;

    const response = await axios.get(apiUrl);
    const charactersData = response.data;

    return res.status(200).json(charactersData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

///////////////////////  Comics d'un personnage spécifique  ////////////////////////////////////////
router.get("/comics/:characterId", async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const apiUrl = `https://lereacteur-marvel-api.herokuapp.com/comics/${characterId}?apiKey=${apiKey}`;

    const response = await axios.get(apiUrl);
    const comicsData = response.data;

    return res.status(200).json(comicsData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

///////////////////////      COMICS   ///////////////////////////////////////////////

router.get("/comics", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8; // Récupérer le paramètre "limit" de la requête, s'il n'est pas fourni, utilisez 10 (valeur par défaut)
    const skip = parseInt(req.query.skip) || 0;
    const apiUrl = `https://lereacteur-marvel-api.herokuapp.com/comics?apiKey=${apiKey}&title=${req.query.title}&limit=${limit}&skip=${skip}`;

    const response = await axios.get(apiUrl);
    const charactersData = response.data;

    return res.status(200).json(charactersData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
///////////////////////  Informations sur un comic spécifique  ////////////////////////////////////
router.get("/comic/:comicId", async (req, res) => {
  try {
    const comicId = req.params.comicId;
    const apiUrl = `https://lereacteur-marvel-api.herokuapp.com/comic/${comicId}?apiKey=${apiKey}`;

    const response = await axios.get(apiUrl);
    const comicData = response.data;

    return res.status(200).json(comicData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////  Informations sur un personnage spécifique  ///////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
router.get("/character/:characterId", async (req, res) => {
  try {
    const characterId = req.params.characterId;
    const apiUrl = `https://lereacteur-marvel-api.herokuapp.com/character/${characterId}?apiKey=${apiKey}`;

    const response = await axios.get(apiUrl);
    const characterData = response.data;

    return res.status(200).json(characterData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/// route signup

router.post("/signup", async (req, res) => {
  const { email, username, password, newsletter } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà dans la base de données
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Un utilisateur avec ces informations existe déjà." });
    }

    // Générer un identifiant unique (UID) pour le salt
    const salt = uid2(16);

    // Hacher le mot de passe avec le salt avant de le sauvegarder dans la base de données
    const hash = SHA256(password + salt).toString(encBase64);

    // Créer un nouvel utilisateur dans la base de données
    const newUser = new User({
      email,
      username,
      password: hash, // Utilisez le mot de passe haché
      newsletter,
      salt, // Stockez le salt dans le modèle utilisateur
    });
    const token = generateToken(newUser._id, newUser.email);
    newUser.token = token; // Stockez le token dans le modèle utilisateur

    await newUser.save();

    return res.status(201).json({ message: "Inscription réussie !", token });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Une erreur est survenue lors de l'inscription." });
  }
});

// login

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe dans la base de données
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    // Hacher le mot de passe fourni avec le salt enregistré dans la base de données
    const hashedPassword = SHA256(password + user.salt).toString(encBase64);

    // Vérifier si le mot de passe haché correspond au mot de passe enregistré dans la base de données
    if (hashedPassword !== user.password) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect." });
    }
    const token = generateToken(user._id, user.email);
    user.token = token; // Mettez à jour le token dans le modèle utilisateur
    await user.save();
    return res
      .status(200)
      .json({ message: "Connexion réussie !", token, username: user.username });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Une erreur est survenue lors de la connexion." });
  }
});

/////////// gestion des favoris

// Route pour ajouter ou supprimer un ID de favori personnage pour l'utilisateur
router.post("/favorischaracter", async (req, res) => {
  const { id, add } = req.body;
  const token = req.headers.authorization;
  const tokenValue = token.split(" ")[1];
  console.log();

  try {
    const user = await User.findOne({ token: tokenValue });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (add) {
      if (!user.favorisPersonnages.includes(id)) {
        user.favorisPersonnages.push(id);
      }
    } else {
      user.favorisPersonnages = user.favorisPersonnages.filter(
        (favoriId) => favoriId.toString() !== id
      );
    }

    await user.save();

    return res.status(200).json({ message: "Favoris mis à jour avec succès." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la mise à jour des favoris.",
    });
  }
});
// Route pour ajouter ou supprimer un ID de favori comics pour l'utilisateur
router.post("/favoriscomics", async (req, res) => {
  const { id, add } = req.body;
  const token = req.headers.authorization;
  const tokenValue = token.split(" ")[1];

  try {
    const user = await User.findOne({ token: tokenValue });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (add) {
      if (!user.favorisComics.includes(id)) {
        user.favorisComics.push(id);
      }
    } else {
      user.favorisComics = user.favorisComics.filter(
        (favoriId) => favoriId.toString() !== id
      );
    }

    await user.save();

    return res
      .status(200)
      .json({ message: "Favoris Comics mis à jour avec succès." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la mise à jour des favoris.",
    });
  }
});
// route pour récuperer l'ensemble des favoris
router.get("/favorisids", async (req, res) => {
  const token = req.headers.authorization;
  const tokenValue = token.split(" ")[1];

  try {
    const user = await User.findOne({ token: tokenValue });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const favorisPersonnagesIDs = user.favorisPersonnages.map((personnage) =>
      personnage.toString()
    );
    const favorisComicsIDs = user.favorisComics.map((comic) =>
      comic.toString()
    );

    // Renvoyez les IDs des favoris de l'utilisateur
    return res.json({ favorisPersonnagesIDs, favorisComicsIDs });
  } catch (error) {
    console.log("Erreur lors de la récupération des favoris :", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la récupération des favoris.",
    });
  }
});

module.exports = router;

///////////////////////       404   ///////////////////////////////////////////////
router.all("*", (req, res) => {
  try {
    return res.status(404).json("not found");
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});
///////////
module.exports = router;
