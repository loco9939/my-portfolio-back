const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");

require("dotenv").config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5050;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("User", { email: String, password: String });

const FinancialData = mongoose.model("FinancialData", {
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  cashWon: Number,
  saving: Number,
  stock: Number,
  realEstate: Number,
  debt: Number,
  date: { type: Date, default: Date.now },
});

app.get("/", async (req, res) => {
  return res.send("Welcome to My Portfolio Server");
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashedPassword });
    await user.save();

    res.status(201).send("User registered successfully");
  } catch (error) {
    console.error("Error registering user:", error);
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

    // Fetch financial data for the user
    const financialData = await FinancialData.findOne({ user: user._id });

    if (!financialData) {
      return res.status(200).json({});
    }

    // Include financial data in the response
    const responseData = {
      financialData: {
        cashWon: financialData.cashWon,
        saving: financialData.saving,
        stock: financialData.stock,
        realEstate: financialData.realEstate,
        debt: financialData.debt,
        date: financialData.date,
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).send("Error signing in");
  }
});

app.post("/save-financial-data", async (req, res) => {
  const { userId, cashWon, saving, stock, realEstate, debt } = req.body;

  try {
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${userId}$`, "i") },
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const financialData = new FinancialData({
      user: user._id,
      cashWon,
      saving,
      stock,
      realEstate,
      debt,
    });

    await financialData.save();

    res.status(201).send("Finacial data saved successfully");
  } catch (error) {
    console.error("Error saving financial data: ", error);
    res.status(500).send("Error saving finacial data");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
