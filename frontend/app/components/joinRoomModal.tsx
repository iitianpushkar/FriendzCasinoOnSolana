"use client";

import { useState,useEffect} from "react";
import { useRouter } from "next/navigation";
import { useProgram } from "../lib/ProgramProvider";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "react-hot-toast"

interface RoomModalProps {
    joinMinesModal: boolean;
    setjoinMinesModal: React.Dispatch<React.SetStateAction<boolean>>;
  }


function JoinRoomModal({joinMinesModal,setjoinMinesModal}: RoomModalProps) {

    const router = useRouter();
    const { program } = useProgram();
    const wallet = useAnchorWallet();

    const publicKey = wallet?.publicKey;

  const [roomId, setRoomId] = useState("");

    useEffect(() => {
      if (!program) return;
    
        const joinListener = program.addEventListener("PlayerJoinedEvent", async (event) => {
          if(event.leader.toString() == publicKey?.toString()){
            console.log("Room joined successfully");
            toast.success(`Room joined`, {
              icon: '🎉',
            });
          }
  
        });

      return () => {
        if (program) {
          program.removeEventListener(joinListener);
        }
      }
    }, [program,publicKey]);

  
  const joinRoom = async () => {
    if (!program || !publicKey) {
        console.log("Program or wallet not found");
        return;
    }

    try {
      const [pda, bump] = await PublicKey.findProgramAddressSync(
        [Buffer.from("room"), Buffer.from(roomId)],
        program.programId
      );
      console.log("PDA: ", pda.toString());
      console.log("Bump: ", bump);

         await program.methods
            .joinRoom()
            .accounts({
                room: pda,
                user: publicKey,
            })
            .rpc();
        setjoinMinesModal(false);
        router.push(`/Games/mines/${roomId}`);
    } catch (err) {
        console.error("Error joining room:", err);
    }
};
  return (
    <div>
        {/* Modal */}
      {joinMinesModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Overlay */}
    <div className="absolute inset-0  backdrop-blur-[1px]"></div>

    {/* Modal content */}
    <div className="relative bg-[#1a2338] p-6 rounded-xl w-full max-w-md text-white shadow-2xl z-10">
      <h2 className="text-xl font-bold mb-4 text-center">Join Room</h2>
      <div className="flex flex-col gap-4">
      <input className='border border-amber-50 w-full mb-4' placeholder='Enter room name' onChange={(e)=>setRoomId(e.target.value)} />
      </div>
      <div className="flex justify-between">
        <button type="button" className="bg-blue-600 p-2 rounded hover:bg-blue-700" onClick={joinRoom}>
          Join
        </button>
        <button
          type="button"
          onClick={() =>{ setjoinMinesModal(false);setRoomId("")}}
          className="bg-gray-500 p-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
        </div>
    </div>
  </div>
)}
      
    </div>
  )
}

export default JoinRoomModal
