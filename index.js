require("dotenv").config();
const express = require("express");
const port = process.env.PORT;

const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
//////////
const routes = require("./routes/routes");
app.use(routes);
////////

app.listen(port, () => {
  console.log(`Serveur Marvel lancé sur le port : ${port} `);
});
