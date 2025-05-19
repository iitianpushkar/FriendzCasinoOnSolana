require('dotenv').config();
const express = require('express');
const commitHash = require('./minesweeper/commitHash.js');
const roomMinesMap = require('./minesweeper/commitHash.js').roomMinesMap;
const submitMines = require('./minesweeper/submitMines.js');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Program } = require('@project-serum/anchor');
const NodeWallet = require('@project-serum/anchor/dist/cjs/nodewallet').default;
const  IDL  = require('./abi.json'); 
const bs58mod = require("bs58");
const bs58    = bs58mod.default || bs58mod;

const app = express();
app.use(express.json());

const base58Key = process.env.PRIVATE_KEY;
if (!base58Key) {
  console.error("Private key not found in .env file");
  process.exit(1);
}

// Decode base58 to Uint8Array
const keypair = Keypair.fromSecretKey(bs58.decode(base58Key));

const wallet = new NodeWallet(keypair);

// Set up connection to Solana Devnet (can change to Mainnet or Testnet)
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Define program ID (replace with your actual program ID)
const programId = new PublicKey(process.env.CONTRACT_ADDRESS);

// Set up provider using the keypair and connection
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

// Initialize the program
const program = new Program(IDL, programId, provider);

  function listenToStart() {

    program.addEventListener("GameStartedEvent",(event)=>{
      console.log(`🏆 Game started: Room ${event.roomId}, leader ${event.leader}, mines${event.mines}, gems${event.gems}, bet${event.totalBet.toNumber()/1000000000}`);
      commitHash(program,event.roomId,event.mines);
    })

    program.addEventListener("MineRevealEvent",async (event)=>{
      console.log('Mine revealing..');
      await submitMines(program, event.roomId, roomMinesMap[event.roomId]);
      delete roomMinesMap[event.roomId];
    })
  }


const PORT = 8000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  listenToStart();
  console.log("Listening for events...");
});
