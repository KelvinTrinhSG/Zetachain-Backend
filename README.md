# ZetaChain Cross-Chain NFT Minter & Sender (Node/Express + Thirdweb)

An Express server that mints an ERC-721 NFT on **ZetaChain Athens Testnet (7001)** and immediately sends it cross-chain via your contract’s `transferCrossChain` method. Built with **thirdweb** SDK.

---

## Features

- `POST /transferCrossChain`:
  1) `safeMint(toAddress, uri)`  
  2) `transferCrossChain(tokenId, receiver, destination)` with native fee
- CORS enabled
- Clear logs & structured error responses
- Simple `.env` driven config

---

## Tech Stack

- Node.js, Express, body-parser, cors  
- thirdweb SDK (`createThirdwebClient`, `getContract`, `prepareContractCall`, `sendAndConfirmTransaction`, `readContract`)  
- ZetaChain Athens (id: 7001)

---

## Prerequisites

- **Node.js** ≥ 18
- A **thirdweb** account & **SECRET KEY**
- A **deployer wallet** private key funded with **ZETA (Athens testnet)**
- Your **ERC-721** contract on ZetaChain with:
  - `function safeMint(address toAddress, string uri)`
  - `function tokenByIndex(uint256) view returns (uint256)` (or adapt to your token ID logic)
  - `function transferCrossChain(uint256 tokenId, address receiver, address destination) payable`

---

## Environment Variables

Create a `.env` in project root:

```bash
WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
THIRDWEB_SECRET_KEY=YOUR_THIRDWEB_SECRET_KEY
CONTRACT_ADDRESS=0xYourNftContractOnZeta
TO_ADDRESS=0xMintRecipientAddress   # used by safeMint step
TOKEN_URI=https://your/metadata.json
```

> The request body still supplies `receiver` and `destination` for the cross-chain step.

---

## Install & Run

```bash
npm i
node index.js
# or: npm run start  (if you set up a script)
```

Server starts at:

```
http://0.0.0.0:3000
```

---

## API

### POST `/transferCrossChain`

**Body**
```json
{
  "receiver": "0xReceiverOnDestinationChain",
  "destination": "0xDestinationChainReceiverOrRouter"
}
```

**Success Response**
```json
{
  "success": true,
  "transferTx": "0x<tx-hash>"
}
```

**Error Responses**
```json
{ "success": false, "step": "mint", "error": "..." }
{ "success": false, "step": "transfer", "error": "..." }
{ "success": false, "step": "handler", "error": "Missing env vars: ..." }
```

---

## Example Requests

### cURL
```bash
curl -X POST http://localhost:3000/transferCrossChain \
  -H "Content-Type: application/json" \
  -d '{
    "receiver":"0x1111111111111111111111111111111111111111",
    "destination":"0x2222222222222222222222222222222222222222"
  }'
```

### Unity (C#)
```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Text;

[System.Serializable]
public class XChainReq { public string receiver; public string destination; }

IEnumerator SendXChain(string api, string receiver, string destination) {
    var payload = JsonUtility.ToJson(new XChainReq{ receiver=receiver, destination=destination });
    var req = new UnityWebRequest(api, "POST");
    byte[] bodyRaw = Encoding.UTF8.GetBytes(payload);
    req.uploadHandler = new UploadHandlerRaw(bodyRaw);
    req.downloadHandler = new DownloadHandlerBuffer();
    req.SetRequestHeader("Content-Type", "application/json");
    yield return req.SendWebRequest();
    Debug.Log($"Status: {req.responseCode} | Body: {req.downloadHandler.text}");
}
```

---

## How It Works (Flow)

1. **Create client & account** from `THIRDWEB_SECRET_KEY` + `WALLET_PRIVATE_KEY`.
2. **Bind contract** at `CONTRACT_ADDRESS` on **ZetaChain Athens (7001)**.
3. **Step 1 — Mint**  
   `safeMint(TO_ADDRESS, TOKEN_URI)` → wait for confirmation.
4. **Read tokenId** (sample uses `tokenByIndex(0)`; adjust if your contract mints sequentially or emits events).
5. **Step 2 — Cross-Chain Send**  
   `transferCrossChain(tokenId, receiver, destination)` with `value: toWei("0.1")` (tune fee).
6. Return `transferTx` hash.

---

## Configuration Notes

- **CORS** is currently `origin: "*"`. For production, restrict to your game’s domain:
  ```js
  cors({ origin: "https://yourgame.example", methods: ["POST","OPTIONS"] })
  ```
- **Fee (`value`)**:  
  `toWei("0.1")` is a placeholder. Adjust per your contract/bridge fee logic.
- **Token ID Retrieval**:  
  - `tokenByIndex(0)` is for demo only. In production, prefer:
    - `totalSupply()-1`  
    - or parse the **Transfer** event from the mint receipt
    - or use a contract method that returns the last minted ID for `TO_ADDRESS`.

---

## Logging

The server logs:

```
📦 Incoming /transferCrossChain request
➡ receiver:     0x...
➡ destination:  0x...
🔁 [1/2] Preparing safeMint...
🚀 [1/2] Sending + waiting for confirmation (safeMint)...
✅ [1/2] safeMint confirmed: 0x...
🔁 [2/2] Preparing transferCrossChain...
🚀 [2/2] Sending + waiting for confirmation (transferCrossChain)...
✅ [2/2] transferCrossChain confirmed: 0x...
```

---

## Troubleshooting

- **`Missing env vars`**: Verify `.env` keys are present and loaded (run `dotenv` before creating app).
- **`Unauthorized` / 401 from RPC**: Check your RPC URL and rate limits; ensure correct chain id (7001).
- **`insufficient funds`**: Wallet must hold enough **ZETA** for gas + cross-chain value.
- **`transferCrossChain failed`**:  
  - Confirm `receiver`, `destination` formats  
  - Ensure your contract supports `payable` and fee amount is sufficient  
  - Check bridge/router config on destination
- **CORS** issues: Ensure your game origin matches the allowed origin on server.

---

## Deploy

- **Render/Railway/Vercel (Serverless)**: Prefer always-on Node host (long-running tx waits).  
- Set environment variables in the hosting dashboard.  
- Expose port **3000** or the platform’s assigned `$PORT`. If required by platform, use:
  ```js
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => { ... });
  ```

---

## Security

- **Never** commit private keys. Use environment variables or platform secrets.
- Consider **separate hot wallet** with minimal funds for mint/send operations.
- Rate-limit the endpoint to prevent abuse (e.g., `express-rate-limit`).
- Validate inputs (`receiver`, `destination`) and add basic schema checks.

---

## License

MIT (or your choice)

---

## Acknowledgements

- [thirdweb](https://thirdweb.com/) SDK & tooling  
- ZetaChain Athens Testnet and public RPC providers

---

### Quick Start (Copy/Paste)

```bash
npm i express cors dotenv body-parser thirdweb
# add .env as described above
node index.js
curl -X POST http://localhost:3000/transferCrossChain \
  -H "Content-Type: application/json" \
  -d '{"receiver":"0x1111111111111111111111111111111111111111","destination":"0x2222222222222222222222222222222222222222"}'
```
