"use client";

import RoomModal from "./roomModal"
import { useState} from 'react'

export default function HomeSidebar (){
    const [showModal, setShowModal] = useState(false);

 
  
    return (
      <>
        {/* Sidebar */}
        <div className="sidebar fixed top-0 left-0 w-[15%] h-screen bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white flex flex-col font-sans">
          {/* Navbar */}
          <div className="Sidebar-navbar bg-[#0d121d] w-full h-16 shadow-md shadow-indigo-500 flex justify-center gap-4 items-center px-2">
            <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 p-2 px-4 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md">Casino</button>
            <button className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-teal-400 hover:to-green-400 p-2 px-4 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md">Sports</button>
          </div>
  
          {/* Profile Card */}
          <div className="Sidebar-card1 bg-[#1a2338] text-white text-center mt-6 flex flex-col gap-4 rounded-2xl mx-3 p-4 shadow-lg shadow-indigo-700">
            <button className="hover:scale-105 transition-transform duration-200">👤 Profile</button>
            <button 
              onClick={() => setShowModal(true)} 
              className="hover:scale-110 hover:text-amber-400 transition-all duration-300"
            >
              🎮 Create Room
            </button>
            <button className="hover:scale-105 transition-transform duration-200">💎 VIP Club</button>
            <button className="hover:scale-105 transition-transform duration-200">🤝 Affiliate</button>
            <button className="hover:scale-105 transition-transform duration-200">📝 Blog</button>
            <button className="hover:scale-105 transition-transform duration-200">💬 Forum</button>
          </div>
  
          {/* Info Card */}
          <div className="Sidebar-card2 bg-[#1a2338] text-white text-center mt-6 flex flex-col rounded-2xl mx-3 p-4 shadow-lg shadow-indigo-700">
            <button className="mb-3 hover:text-amber-400 transition-colors duration-200">🎯 Sponsorships</button>
            <button className="mb-3 hover:text-amber-400 transition-colors duration-200">🛡️ Responsible Gambling</button>
            <button className="mb-3 hover:text-amber-400 transition-colors duration-200">🧑‍💻 Live Support</button>
            <button className="hover:text-amber-400 transition-colors duration-200">🌐 Language: English</button>
          </div>
        </div>
  
        {/* Modal */}
        <RoomModal showModal={showModal} setShowModal={setShowModal} />
      </>
    );
}