import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// serve arquivos estáticos em /public
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;

// Função para gerar JWT
function gerarToken() {
  const payload = {
    iss: process.env.PDF_API_KEY,
    sub: process.env.PDF_API_KEY, // obrigatório
    aud: "https://us1.pdfgeneratorapi.com/",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 // 1 minuto de validade
  };
  return jwt.sign(payload, process.env.PDF_API_SECRET, { algorithm: "HS256" });
}

// rota raiz -> serve index.html automaticamente por static
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Rota para gerar PDF — envia **todos** os campos do req.body como data
app.post("/gerar-pdf", async (req, res) => {
  try {
    const token = gerarToken();

    // pega todo o corpo enviado (cliente + projeto + empresa)
    const dataObject = req.body || {};

    const TEMPLATE_ID = process.env.PDF_TEMPLATE_ID;
    if (!TEMPLATE_ID) {
      return res.status(400).json({ success: false, error: "Missing PDF_TEMPLATE_ID" });
    }

    const response = await axios.post(
      "https://us1.pdfgeneratorapi.com/api/v4/documents/generate",
      {
        template: {
          id: TEMPLATE_ID,
          data: dataObject
        },
        format: "pdf",
        output: "url"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      pdfUrl: response.data.response
    });

  } catch (error) {
    console.error("PDF Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
