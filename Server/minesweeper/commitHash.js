const { PublicKey } = require('@solana/web3.js');
const { keccak256 } = require('ethers');
const roomMinesMap = {};

module.exports = async function commitHash(program, roomId, minesCount) {

  const positions = [];
  while (positions.length < minesCount) {
    const rand = Math.floor(Math.random() * 25);
    if (!positions.includes(rand)) {
      positions.push(rand);
    }
  }

  const positionsBytes = Uint8Array.from(positions);
  const hashHex       = keccak256(positionsBytes);          // "0x3f7a..."
  const hashBytes     = Buffer.from(hashHex.slice(2), "hex"); // Buffer<32 bytes>

  const [pda,bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("room"), Buffer.from(roomId)],
    program.programId
  );

  // If `roomId` is u64 or a struct, convert accordingly
  const tx = await program.methods
    .commitMineHash(hashBytes)
    .accounts({
      room: pda,
      user:program.provider.wallet.publicKey
    })
    .rpc();

    if(tx){
        console.log(`✅ Committed for room ${roomId}:`, hashHex);
    }
    else{
        console.log(`Error committing for room ${roomId}`);
    }

  roomMinesMap[roomId] = positions;
};

module.exports.roomMinesMap = roomMinesMap;
