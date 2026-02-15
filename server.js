const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Multer for camera photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// OpenAI setup
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

// SQLite setup
const db = new sqlite3.Database('db.sqlite');
db.run(`CREATE TABLE IF NOT EXISTS users (
  name TEXT PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0
)`);

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req,res)=>{
  const { name, description } = req.body;
  const file = req.file;
  if(!name || !file) return res.status(400).send("Missing data");

  db.get("SELECT * FROM users WHERE name=?",[name], async (err,row)=>{
    if(!row){
      db.run("INSERT INTO users (name, xp, attempts) VALUES (?,0,1)",[name]);
      row = { xp: 0 };
    } else {
      if(row.attempts >= 3) return res.json({success:false,message:"Max 3 attempts reached"});
      db.run("UPDATE users SET attempts = attempts+1 WHERE name=?",[name]);
    }

    // === AI Verification Placeholder ===
    // Replace this with ChatGPT Vision call
    const xp = Math.floor(Math.random()*50)+20;

    db.run("UPDATE users SET xp = xp + ? WHERE name=?",[xp,name]);

    // Get leaderboard
    db.all("SELECT name, xp FROM users ORDER BY xp DESC",(err,leaderboard)=>{
      res.json({success:true,xp,xp,totalXP: row.xp + xp, leaderboard});
    });
  });
});

// Leaderboard endpoint
app.get('/api/leaderboard', (req,res)=>{
  db.all("SELECT name, xp FROM users ORDER BY xp DESC",(err,leaderboard)=>{
    res.json(leaderboard);
  });
});

// Serve frontend for Render static deployment
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"frontend.html"));
});

app.listen(process.env.PORT || 3000,()=>console.log("Server running"));
