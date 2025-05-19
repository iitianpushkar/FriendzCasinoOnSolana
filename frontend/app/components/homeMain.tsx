"use client";

import Image from "next/image";
import { useState } from "react";
import JoinRoomModal from "./joinRoomModal";


export default function HomeMain() {
  const [joinMinesModal, setjoinMinesModal] = useState(false);

  return (
    <>
      {/* Main Content */}
      <div className="main mt-16 float-right left-[20%] w-[85%] bottom-0 bg-gradient-to-b from-[#1a2c38] to-[#0f172a] text-white overflow-y-auto scroll-smooth font-sans shadow-[0_0_25px_5px_rgba(99,102,241,0.4)]">
        <div className="vip-card bg-[url('/bg.png')] bg-cover w-full h-[320px] flex items-center justify-end">
          <div className="w-[365px] h-[196px] rounded-2xl border border-amber-600 mr-12 flex flex-col justify-center items-center bg-[#1e293b]/80 backdrop-blur-sm shadow-md shadow-blue-700">
            <div className="text-center font-bold text-lg">Welcome to FriendzCasinoOnBase</div>
            <div className="text-center font-bold text-base ml-4">Play, Bet and Win...</div>
          </div>
          <Image src="/girllogo.png" alt="girl" width={350} height={230} className="rounded-2xl ml-8" />
          <Image src="/3men-logo.png" alt="men" width={350} height={230} className="rounded-2xl mr-8 ml-4" />
  
        </div>

        <div className="text-xl font-semibold px-4 mt-6 mb-2">🎮 Continue Playing</div>
        <div className="games-section w-full h-[232px] overflow-x-auto whitespace-nowrap space-x-4 flex px-4 scroll-smooth scrollbar-hide">
          <Image src="/minegamelogo.png" alt="mines" width={149} height={216} className="rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-105 shadow-md shadow-blue-700" onClick={() => setjoinMinesModal(true)} />
          <JoinRoomModal joinMinesModal={joinMinesModal} setjoinMinesModal={setjoinMinesModal} />
          {["/life-and-death-logo.png", "/mental2-logo.png", "/racing-logo.png", "/olympus-logo.png", "/duel-at-dawn-logo.png", "/cs2-logo.png", "/sweet-bonanza-logo.png", "/mineslogo.png", "/mineslogo.png"].map((src, index) => (
            <Image key={index} src={src} alt="game" width={149} height={216} className="rounded-2xl transition-transform duration-200 hover:scale-105 shadow-md shadow-blue-700" />
          ))}
        </div>

        <div className="text-xl font-semibold px-4 mt-6 mb-2">🔥 Trending Games</div>
        <div className="games-section w-full h-[232px] overflow-x-auto whitespace-nowrap space-x-4 flex px-4 scroll-smooth scrollbar-hide">
          {["/blackjack-logo.png", "/roulette-logo.png", "/craps-logo.png", "/dragontiger-logo.png", "/texashold-logo.png", "/baccarat-logo.png", "/sugarrushlogo.png", "/sugarrushlogo.png", "/sugarrushlogo.png", "/sugarrushlogo.png"].map((src, index) => (
            <Image key={index} src={src} alt="game" width={149} height={216} className="rounded-2xl transition-transform duration-200 hover:scale-105 shadow-md shadow-blue-700" />
          ))}
        </div>

        <div className="text-xl font-semibold px-4 mt-6 mb-2">🏅 Sports</div>
        <div className="games-section w-full h-[232px] overflow-x-auto whitespace-nowrap space-x-4 flex px-4 scroll-smooth scrollbar-hide">
          {["/cricketlogo.png", "/basketball-logo.png", "/baseball-logo.png", "/tennis-logo.png", "/mma-logo.png", "/golf-logo.png", "/cricketlogo.png", "/cricketlogo.png", "/cricketlogo.png", "/cricketlogo.png"].map((src, index) => (
            <Image key={index} src={src} alt="sport" width={149} height={216} className="rounded-2xl transition-transform duration-200 hover:scale-105 shadow-md shadow-blue-700" />
          ))}
        </div>
      </div>
    </>
  );
}
