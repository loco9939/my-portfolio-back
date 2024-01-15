const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost/my-asset-portfolio", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("User", { email: String, password: String });

app.get("/", async (req, res) => {
  return res.send("Welcome to My Portfolio Server");
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).send("User registered successfully");
  } catch (error) {
    res.status(500).send("Error registering user");
  }
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).send("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).send("Invalid email or password");
    }

    res.status(200).send("Sign-in Successful");
  } catch (error) {
    res.status(500).send("Error signing in");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
