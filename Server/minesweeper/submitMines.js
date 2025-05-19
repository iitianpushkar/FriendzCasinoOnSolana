const { PublicKey } = require('@solana/web3.js');


module.exports = async function submitMines(program, roomId, mines) {
    console.log("mines:", mines);

    const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("room"), Buffer.from(roomId)],
        program.programId
    );
    try {
        const tx= await program.methods
        .submitMines(Buffer.from(mines))
        .accounts({
            room: pda,
            user: program.provider.wallet.publicKey,
        })
        .rpc();
        console.log(`✅ Submitted mines for room ${roomId}:`, tx); 
    } catch (error) {
        console.error('Error submitting mines:', error);
        return;  
    }
}