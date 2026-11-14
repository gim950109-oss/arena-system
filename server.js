const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database(process.env.DB_PATH || "arena.sqlite");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

db.exec(`
CREATE TABLE IF NOT EXISTS states (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
)
`);

const initialState = {
  player: {
    name: "초보 모험가",
    level: 1,
    job: "초보자",
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    exp: 0,
    gold: 0
  },
  stats: {
    strength: 5,
    agility: 5,
    intelligence: 5,
    vitality: 5,
    luck: 5
  },
  inventory: [],
  equipment: {}
};

function getState(id) {
  const row = db.prepare(
    "SELECT data FROM states WHERE id = ?"
  ).get(id);

  if (row) return JSON.parse(row.data);

  db.prepare(
    "INSERT INTO states (id, data) VALUES (?, ?)"
  ).run(id, JSON.stringify(initialState));

  return initialState;
}

app.get("/api/state/:id", (req, res) => {
  res.json(getState(req.params.id));
});

app.put("/api/state/:id", (req, res) => {
  db.prepare(`
    INSERT INTO states (id, data)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data
  `).run(req.params.id, JSON.stringify(req.body));

  res.json({ success: true });
});

app.post("/api/state/:id/action", (req, res) => {
  const state = getState(req.params.id);
  const { action, item, amount } = req.body;

  if (action === "add_item") {
    state.inventory.push({
      name: item,
      amount: amount || 1
    });
  } else if (action === "remove_item") {
    const index = state.inventory.findIndex(
      x => x.name === item
    );
    if (index !== -1) state.inventory.splice(index, 1);
  } else if (action === "set_vitals") {
    Object.assign(state.player, req.body.values);
  } else if (action === "set_exp") {
    state.player.exp = amount;
  } else if (action === "set_player") {
    Object.assign(state.player, req.body.values);
  }

  db.prepare(
    "UPDATE states SET data = ? WHERE id = ?"
  ).run(JSON.stringify(state), req.params.id);

  res.json(state);
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Arena server running on ${port}`);
});
