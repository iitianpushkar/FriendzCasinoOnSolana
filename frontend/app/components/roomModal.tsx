"use client";

import React ,{useEffect} from 'react'
import { useProgram } from '../lib/ProgramProvider';
import { PublicKey,SystemProgram ,LAMPORTS_PER_SOL} from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import {BN} from "@project-serum/anchor";
import {toast} from 'react-hot-toast'; 


interface RoomModalProps {
    showModal: boolean;
    setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  }

  function RoomModal({ showModal, setShowModal }: RoomModalProps) {

    const [roomId, setRoomId] = React.useState("");
    const [betAmount, setBetAmount] = React.useState(0);

    
    const { program } = useProgram();
    const wallet = useAnchorWallet();
    const publicKey = wallet?.publicKey;

    useEffect(() => {
      if (!program) return;
    
        const roomListener = program.addEventListener("RoomCreatedEvent", async (event) => {
          if(event.leader.toString() == publicKey?.toString()){
            console.log("Room created successfully from event listener");
            toast.success(`Room created`, {
              icon: '🎉',
            }); 
          }
  
        });

      return () => {
        if (program) {
          program.removeEventListener(roomListener);
        }
      }
    }, [program,publicKey]);




    const createRoom = async ()=>{

      if (!program || !wallet) {
        console.log("Program or wallet not found");
        return;
      }

      console.log("Creating room");

      const publicKey = wallet.publicKey;

      try {

      const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("room"), Buffer.from(roomId)],
        program.programId
      );
      console.log("PDA: ", pda.toString());
      console.log("Bump: ", bump);

       await program.methods
        .createRoom(roomId, new BN(betAmount*LAMPORTS_PER_SOL))
        .accounts({
          room: pda,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

        console.log("room created successfully")
        setShowModal(false);
      }
      catch (error) {
        console.error("Error creating room:", error);

        
      }
    }
  return (
<div>
        {/* Modal */}
        {showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Overlay */}
    <div className="absolute inset-0  backdrop-blur-[1px]"></div>

    {/* Modal content */}
    <div className="relative bg-[#1a2338] p-6 rounded-xl w-full max-w-md text-white shadow-2xl z-10">
      <h2 className="text-xl font-bold mb-4 text-center">Create a New Room</h2>
      <div>
      <input className='border border-amber-50 w-full mb-4' placeholder='Enter room name' onChange={(e)=>setRoomId(e.target.value)} />
      <input className='border border-amber-50 w-full mb-4' placeholder='Enter bet amount in SOL' type="number" onChange={(e)=>setBetAmount(Number(e.target.value))} />
      </div>
      <div className="flex justify-between">
        <button type="button" className="bg-blue-600 p-2 rounded hover:bg-blue-700" onClick={createRoom}>
          Create
        </button>
        <button
          type="button"
          onClick={() => setShowModal(false)}
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

export default RoomModal