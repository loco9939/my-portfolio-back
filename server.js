const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const dayjs = require("dayjs");

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
  lastUpdate: String,
  monthlyAssets: {
    type: Map,
    of: {
      cashWon: Number,
      saving: Number,
      stock: Number,
      realEstate: Number,
      debt: Number,
    },
  },
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

// TODO: 처음 자산 입력시 입력한 날짜의 월을
app.post("/save-financial-data", async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${userId}$`, "i") },
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Loop through each month's data in the request
    for (const key in req.body) {
      if (key.includes("_")) {
        const [month, year] = key.split("_");
        const financialData = req.body[key];

        // Save financial data for the current month
        const financialDataEntry = new FinancialData({
          user: user._id,
          cashWon: financialData.cashWon,
          saving: financialData.saving,
          stock: financialData.stock,
          realEstate: financialData.realEstate,
          debt: financialData.debt,
          date: `${year}${month.padStart(2, "0")}`, // Format: "YYYYMM"
        });
        await financialDataEntry.save();
      }
    }

    res.status(201).send("Financial data saved successfully");
  } catch (error) {
    console.error("Error saving financial data: ", error);
    res.status(500).send("Error saving financial data");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
