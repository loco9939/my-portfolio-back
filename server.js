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
    const financialData = await FinancialData.findOne({
      user: user._id,
    });

    if (!financialData) {
      return res.status(200).json({});
    }

    const responseData = {
      monthlyAssets: financialData.monthlyAssets,
      lastUpdate: financialData.lastUpdate,
    };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).send("Error signing in");
  }
});

/**  TODO: 자산 데이터 구조 수정하기 24.03.03 기준
 * [X] 자산 첫 등록시 데이터 입력
 */
// ...
app.post("/save-financial-data", async (req, res) => {
  const { userId, lastUpdate, monthlyAssets } = req.body;

  try {
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${userId}$`, "i") },
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Loop through each month's data in the request
    for (const key in monthlyAssets) {
      const financialData = monthlyAssets[key];

      // Save financial data for the current month
      const financialDataEntry = new FinancialData({
        user: user._id,
        lastUpdate,
        monthlyAssets: {
          [key]: {
            cashWon: financialData.cashWon,
            saving: financialData.saving,
            stock: financialData.stock,
            realEstate: financialData.realEstate,
            debt: financialData.debt,
          },
        },
      });
      await financialDataEntry.save();
    }

    res.status(201).send("Financial data saved successfully");
  } catch (error) {
    console.error("Error saving financial data: ", error);
    res.status(500).send("Error saving financial data");
  }
});

app.patch("/update-financial-data/:userId", async (req, res) => {
  const { userId } = req.params;
  const updatedData = req.body;

  try {
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${userId}$`, "i") },
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Find the specific financial data entry to update
    const financialDataEntry = await FinancialData.findOne({
      user: user._id,
    });

    if (!financialDataEntry) {
      return res.status(404).send("Financial data entry not found");
    }

    // Update only the specified fields
    financialDataEntry.monthlyAssets.cashWon =
      updatedData.cashWon ?? financialDataEntry.monthlyAssets.cashWon;
    financialDataEntry.monthlyAssets.saving =
      updatedData.saving ?? financialDataEntry.monthlyAssets.saving;
    financialDataEntry.monthlyAssets.stock =
      updatedData.stock ?? financialDataEntry.monthlyAssets.stock;
    financialDataEntry.monthlyAssets.realEstate =
      updatedData.realEstate ?? financialDataEntry.monthlyAssets.realEstate;
    financialDataEntry.monthlyAssets.debt =
      updatedData.debt ?? financialDataEntry.monthlyAssets.debt;

    // Save the updated financial data entry
    await financialDataEntry.save();

    res.status(200).send("Financial data updated successfully");
  } catch (error) {
    console.error("Error updating financial data: ", error);
    res.status(500).send("Error updating financial data");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
