import express from "express";
import cors from "cors";
import { config } from "dotenv";
import bodyParser from "body-parser";

import {
  createThirdwebClient,
  getContract,
  sendAndConfirmTransaction,
  defineChain,
  prepareContractCall,
} from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";

import { toWei } from "thirdweb/utils"; // thêm dòng này

config();

const app = express();

// ✅ CORS: cho phép localhost (WebGL) và các domain bạn host
const ALLOWED_ORIGINS = ["https://zetachain-backend-link-chain.onrender.com"];

const chainZeta = defineChain({
  id: 7001,
  rpc: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
  nativeCurrency: {
    name: "ZETA",
    symbol: "ZETA",
    decimals: 18,
  },
});

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ Rất quan trọng: bật preflight cho mọi route (hoặc riêng /transferCrossChain)
app.options(
  "*",
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json()); // thay cho body-parser

function requireEnv(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length)
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
}

app.post("/transferCrossChain", async (req, res) => {
  const { tokenId, receiver, destination } = req.body;

  console.log("\n📦 Incoming /transferCrossChain request");
  console.log("➡ tokenId:     ", tokenId);
  console.log("➡ receiver:    ", receiver);
  console.log("➡ destination: ", destination);

  try {
    requireEnv(
      "WALLET_PRIVATE_KEY",
      "THIRDWEB_SECRET_KEY",
      "CONTRACT_ADDRESS",
      "TO_ADDRESS",
      "TOKEN_URI"
    );

    const client = createThirdwebClient({
      secretKey: process.env.THIRDWEB_SECRET_KEY,
    });

    const account = privateKeyToAccount({
      client,
      privateKey: process.env.WALLET_PRIVATE_KEY,
    });

    const contract = getContract({
      client,
      address: process.env.CONTRACT_ADDRESS,
      chain: chainZeta,
    });

    // // --------------------- STEP 1: safeMint ---------------------
    // console.log("🔁 [1/2] Preparing safeMint...");
    // const transaction1 = await prepareContractCall({
    //   contract,
    //   method: "function safeMint(address toAddress, string uri)",
    //   params: [process.env.TO_ADDRESS, process.env.TOKEN_URI],
    // });

    // console.log("🚀 [1/2] Sending + waiting for confirmation (safeMint)...");
    // let receipt1;
    // try {
    //   receipt1 = await sendAndConfirmTransaction({
    //     transaction: transaction1,
    //     account,
    //   });
    // } catch (e) {
    //   console.error("❌ safeMint failed:", e);
    //   return res
    //     .status(500)
    //     .json({ success: false, step: "mint", error: e.message });
    // }

    // const mintTxHash = receipt1.transactionHash;
    // console.log("✅ [1/2] safeMint confirmed:", mintTxHash);

    // // (Tuỳ chọn) Nếu cần đảm bảo thêm block confirmations, bạn có thể chờ thêm ở đây.
    // // Ví dụ: đợi vài giây hoặc 1-2 block tuỳ chain.
    // // await new Promise((r) => setTimeout(r, 3000));

    // --------------------- STEP 2: transferCrossChain ---------------------
    const tokenIdStr = tokenId?.toString();
    console.log("🔁 [2/2] Preparing transferCrossChain...");
    const transaction2 = await prepareContractCall({
      contract,
      method:
        "function transferCrossChain(uint256 tokenId, address receiver, address destination) payable",
      params: [tokenIdStr, receiver, destination],
      value: toWei("0.1"), // native fee (0.01 ZETA chẳng hạn)
      // Nếu cần native fee hãy thêm: value: toWei("0.01")
    });

    console.log(
      "🚀 [2/2] Sending + waiting for confirmation (transferCrossChain)..."
    );
    let receipt2;
    try {
      receipt2 = await sendAndConfirmTransaction({
        transaction: transaction2,
        account,
      });
    } catch (e) {
      console.error("❌ transferCrossChain failed:", e);
      return res
        .status(500)
        .json({ success: false, step: "transfer", error: e.message });
    }

    const transferTxHash = receipt2.transactionHash;
    console.log("✅ [2/2] transferCrossChain confirmed:", transferTxHash);

    return res.json({
      success: true,
      //   mintTx: mintTxHash,
      transferTx: transferTxHash,
    });
  } catch (error) {
    console.error("❌ Handler failed:", error);
    return res
      .status(500)
      .json({ success: false, step: "handler", error: error.message });
  }
});

// ✅ Render: dùng PORT do Render cấp và bind 0.0.0.0
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server on http://0.0.0.0:${PORT}`);
});
