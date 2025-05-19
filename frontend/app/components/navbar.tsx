"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";
import { useRouter } from "next/navigation";


const WalletMultiButtonDynamic = dynamic(
    async () =>( await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
    { ssr: false }
  );

export default function Navbar(){

    const [showModal, setShowModal] = useState(false);
    const [roomId, setRoomId] = useState("");

    const router = useRouter();

    return(
    <>
          {/* Navbar */}
        <div className="Navbar fixed top-0 left-[15%] w-[85%] h-16 bg-[#1a2c38] p-4 text-white flex justify-between items-center shadow shadow-indigo-500">
        <div className="logo text-xl font-bold">FriendzCasino</div>
        <button className="bg-amber-600 p-2 rounded-2xl" onClick={()=>setShowModal(true)}>Go To Room</button>

         <WalletMultiButtonDynamic></WalletMultiButtonDynamic>

        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0  backdrop-blur-[1px]"></div>
            {/* Modal content */}
            <div className="relative bg-[#1a2338] p-6 rounded-xl w-full max-w-md text-white shadow-2xl z-10">
              <h2 className="text-xl font-bold mb-4">Go To Room</h2>
              <input type="text" placeholder="Enter room ID" className="p-2 rounded mb-4 w-full" onChange={(e)=>setRoomId(e.target.value)} />
              <div className="flex justify-between">
              <button type="button" className="bg-blue-600 p-2 rounded hover:bg-blue-700" onClick={()=>{setShowModal(false);router.push(`/Games/mines/${roomId}`) }}>
                GO
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
        {/* End of Modal */}
    </>
    )
}
