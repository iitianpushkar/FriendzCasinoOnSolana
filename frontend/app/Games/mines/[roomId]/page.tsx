"use client";

import { useEffect, useState,useCallback } from "react";
import Navbar from "@/app/components/navbar";
import HomeSidebar from "@/app/components/homeSidebar";
import {  useParams } from "next/navigation";
import Image from "next/image";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/app/lib/ProgramProvider";
import { PublicKey } from "@solana/web3.js";
import {Room} from "../interface"


export default function RoomMines() {
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [numMines, setNumMines] = useState(0);
  const [betPlaced, setBetPlaced] = useState(false);
  const [message, setMessage] = useState("");
  const [gems, setGems] = useState(0);
  const [roomData, setRoomData] = useState<Room | null>(null);

  const [roomPda, setRoomPda] = useState<PublicKey | undefined>(undefined);

  const [gameStarted, setGameStarted] = useState(false);
  const [cellsChosen, setCellsChosen] = useState<number[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState("");
  const [yourScore,setYourScore] = useState(0);

  const [showModal, setShowModal] = useState(false);

  const params= useParams();
  const {roomId} = params as {roomId: string};

  const mineSet = new Set(minePositions.map((pos) => Number(pos)));

  const { program } = useProgram();
  const wallet = useAnchorWallet();
  const publicKey = wallet?.publicKey;

  const fetchRoomData = useCallback(async () => {
    if (!program || !publicKey) {
      console.log("Program or wallet not found");
      return;
    }
    try {
      const [pda,bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("room"), Buffer.from(roomId)],
        program.programId
      );
      console.log("Room PDA: ", pda.toString(), "Bump: ", bump);
      setRoomPda(pda);
      const roomAccount = await program.account.room.fetch(new PublicKey(pda));
      console.log("Room account data:", roomAccount);
      setRoomData({
        ...roomAccount,
        roomId
      } as Room);
    }
    catch (error) {
      console.error("Error fetching room data:", error);
    }
  },[program, publicKey, roomId])

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  useEffect(() => {
    if(roomData && roomData.active.find(p => p.toString() == publicKey?.toString())){
      setBetPlaced(true);
    }
    if(roomData && roomData.started==true){
      setGameStarted(true);
    }
    if(roomData && roomData.players.length > 0){
      const currentPlayer = roomData.players.find(p => p.player.toString() == publicKey?.toString());
      if (currentPlayer && currentPlayer.clicked.length != 0) {
        setCellsChosen(currentPlayer.clicked);
      }
    }
  }, [roomData, publicKey]);
  

  useEffect(() => {
    if (!program || !publicKey) return;
  
    const listeners: number[] = [];
  
    const setupListeners = async () => {

      const joinedListener = await program.addEventListener("PlayerJoinedEvent", async (event) => {

        if(event.roomId == roomId) {
          await fetchRoomData();
        }
      })
      const betListener = await program.addEventListener("BetEvent", async (event) => {
        if (event.player.toString() == publicKey.toString()) {
          setMessage(`You betted`);
        } 
        if (event.roomId == roomId) {
          await fetchRoomData();
        }
      });

      const submitListener = await program.addEventListener("PlayerCellsEvent", async (event) => {

        if(event.player.toString() == publicKey.toString()) {
          setMessage(`You submitted cells.`);
          await fetchRoomData();
        }

      })

      const hashMismatchListener = await program.addEventListener("HashMismatchEvent", (event) => {
        if(event.roomId == roomId) {
          setMessage(`❌ Hash mismatch for player`);
          console.log(`submitted hash: ${event.submittedHash}`);
          console.log(`expected hash: ${event.expectedHash}`);
          fetchRoomData();
        }
      });

      const scoreListener = await program.addEventListener("ScoreEvent", (event) => {
        if(event.player.toString() == publicKey.toString()) {
          fetchRoomData();
          console.log(`🏆Your score: ${event.score}`);
          setYourScore(event.score);
        }
      });

      const minePositionListener = await program.addEventListener("MinePositionEvent", (event) => {
        if(event.roomId == roomId) {
          console.log(`💣 Mine positions: ${event.revealedMines}`);
          fetchRoomData();
          setMinePositions(event.revealedMines);
        }
      });
  
      const gameOverListener = await program.addEventListener("GameOverEvent", async (event) => {
        if(event.roomId == roomId) {
          console.log(`🏆 Game Over! Winner: ${event.winners.toString()} with score ${event.score}`);
          setBetPlaced(false);
          setGameStarted(false);
          setMessage(`🏆 Game Over! Bet again`)
          setGameOverMessage(`🏆 Winners:${event.winners.toString().split(",")} with score ${event.score}.`)
          setShowModal(true);
          await fetchRoomData();
        }
      });
  
      const startListener = await program.addEventListener("GameStartedEvent", async (event) => {
        if(event.roomId==roomId){
          setMessage("🔄 Game started! Start clicking.");
          await fetchRoomData();
        }

      });
  
      listeners.push(joinedListener,betListener, gameOverListener, startListener,minePositionListener, hashMismatchListener, scoreListener, submitListener);
    };
  
    setupListeners();
  
    // Clean up listeners when component unmounts
    return () => {
      listeners.forEach((listenerId) => {
        program.removeEventListener(listenerId);
      });
    };
  }, [fetchRoomData,roomId,program,publicKey]);
  
  const handleBet = async () => {
    if (!program || !publicKey) {
      console.log("Program or wallet not found");
      return;
    }
    try {
       await program.methods
        .bet()
        .accounts({
          room: roomPda,
          user: publicKey,
        })
        .rpc();

          await fetchRoomData();
        
      
    } catch (error) {
      console.error("Error placing bet:", error);
      await fetchRoomData();
    }
  };

  const handleStartGame = async () => {
    if (!program || !publicKey) {
      console.log("Program or wallet not found");
      return;
    }

    if (numMines < 3 || gems < 5 || numMines >= 21 || gems >= 23) {
      alert("Please enter valid values for mines and gems.");
      return;
    }
    if(!betPlaced){
      alert("Please place a bet before starting the game.");
      return;
    }
    if (gameStarted) {
      alert("Game already started. Cannot start again.");
      return;
    }

    try {
       await program.methods
        .startGame(numMines, gems)
        .accounts({
          room: roomPda,
          user: publicKey,
        })
        .rpc();
      
        await fetchRoomData();

      
    } catch (error) {
      console.error("Error starting game:", error);
      await fetchRoomData();
    }
  };

  const handleCellClick = async (idx: number) => {
    if (!gameStarted || !betPlaced || !roomData) return;
  
    if (cellsChosen.includes(idx)) return;

    if (cellsChosen && cellsChosen.length == roomData.gems) {
      alert("Cells already chosen.");
      return;
    }
  
    if (cellsChosen.length < roomData.gems) {
      setCellsChosen((prev) => [...prev, idx]);
    }

    return null;
  }

  const handleSubmitCells = async () => {
    try {

      if (!program || !publicKey || !roomData) {
        console.log("Program or wallet or room data not found");
        return;
      }

      const currentPlayer = roomData.players.find(p => p.player.toString() === publicKey?.toString());
      if (currentPlayer && currentPlayer.clicked.length != 0) {
        alert("Cells already submitted.");
        return;
      }
      if (cellsChosen && cellsChosen.length != roomData.gems) {
        alert("Choose cells equal to gems.");
        return;
      }
       await program.methods
        .cellsChosen(Buffer.from(cellsChosen))
        .accounts({
          room: roomPda,
          user: publicKey,
        })
        .rpc();

        await fetchRoomData();

    }
    catch(error){
      console.error("Error submitting cells:", error);
      await fetchRoomData();
    }
  }

  const handleReveal = async () => {

    if (!program || !publicKey || !roomData) {
      console.log("Program or wallet or room data not found");
      return;
    }
    if (cellsChosen.length == 0) {
      alert("Please submit cells before revealing.");
      return;
    }
    try {

     await program.methods
        .revealMines()
        .accounts({
          room: roomPda,
          user: publicKey,
        })
        .rpc()
      

      await fetchRoomData();
      
    } catch (error) {
      console.error("Error revealing mines:", error);
      await fetchRoomData();
      
    }
  }

  const renderCellContent = (idx:number) =>
  {
    if(minePositions.length == 0){
      return null;
    }
    else{
        return (
          <Image
            src={mineSet.has(idx) ? "/mine.svg" : "/gem.svg"}
            alt={mineSet.has(idx) ? "mine" : "gem"}
            width={111}
            height={101}
          />
        );
      
  }
  }
  return (
    <>
      <Navbar />
      <HomeSidebar />
      <div className="main mt-16 float-right left-[15%] w-[85%] bottom-0 bg-[#1a2c38] p-4 text-white overflow-y-auto h-screen">
        <div className="flex">
          {/* Bet Form */}
          <div className="betForm w-[300px] h-[652px] ml-4 mt-4 rounded-bl-2xl rounded-tl-2xl bg-[#213743] p-3 flex flex-col gap-4">
            <div className="slider w-[276px] h-[50px] bg-[#0f212e] rounded-full flex gap-4">
              <div className="w-[150px] h-[40px] bg-[#1a2c38] ml-1 mt-1 rounded-full flex justify-center items-center">Manual</div>
              <div className="w-[120px] h-[50px] font-medium flex justify-center items-center">Auto</div>
            </div>

            <div>
              <div className="mines-number text-[#b1bad3]">Mines</div>

                <input
                type="number"
                className="w-[276px] h-[40px] bg-[#0f212e] rounded-sm mt-2 p-2"
                placeholder="Enter number of mines e.g. 3"
                value={numMines}
                onChange={(e) => setNumMines(Number(e.target.value))}
              />
            </div>

            <div>
              <div className="gems-number text-[#b1bad3]">Gems</div>
                <input
                type="number"
                className="w-[276px] h-[40px] bg-[#0f212e] rounded-sm mt-2 p-2"
                placeholder="Enter number of gems e.g 5"
                value={gems}
                onChange={(e) => setGems(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-4 justify-center items-center">
              <div className="flex gap-4">
            <button className="bg-green-700 w-[100px] rounded-2xl shadow shadow-amber-600" onClick={handleBet}> 1. Bet</button>
            <button className="bg-red-600 w-[110px] rounded-2xl shadow shadow-blue-800 " onClick={handleStartGame}> 2. Start Game</button>
            </div>
            <div className="flex gap-4">
            <button className="bg-amber-700 w-[120px] rounded-2xl shadow shadow-gray-950" onClick={handleSubmitCells}> 3. Submit Cells</button>
            <button className="bg-fuchsia-800 w-[120px] rounded-2xl shadow shadow-neutral-200" onClick={handleReveal}> 4. Reveal Mines</button>
            </div>
            </div>



            {message && (
              <div className="text-center text-sm text-white">{message}</div>
            )}

            <div className=" text-white text-sm">Bet Amount needed : {roomData && roomData.betAmount.toNumber()/1000000000}</div>
            <div className=" text-white text-sm">Players Joined : {roomData && roomData.joined.length}</div>
            <div className="text-white text-sm">Players Betted : {roomData && roomData.active.length}</div>
            <div className="text-white text-sm">Total Bet : {roomData && roomData.totalBet.toNumber()/1000000000}</div>
            <div className="text-white text-sm">Mines : {roomData && roomData.mines}</div>
            <div className ="text-white text-sm">Gems: {roomData && roomData.gems}</div>
          </div>

          {/* Game Frame */}
          <div className="game-content w-[893px] h-[652px] bg-[#0f212e] mt-4 rounded-2xl">
            <div className="wrap w-[630px] h-[650px] p-4 grid grid-cols-5 gap-4 ml-36">
              {Array.from({ length: 25 }).map((_, idx) =>{
                const isChosen = cellsChosen.includes(idx);
                 return (
                
                <div
                  key={idx}
                  className={`mines w-[112px] h-[112px] rounded-lg shadow-lg shadow-[#000] flex justify-center items-center cursor-pointer 
                  ${isChosen ? 'bg-red-600' : 'bg-[#1a2c38]'}`}
                  onClick={() => handleCellClick(idx)}
                >
                  {renderCellContent(idx)}
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 backdrop-blur-[1px]" />
    <div
      className="
        relative 
        bg-[#1a2338] 
        p-6 
        rounded-xl 
        text-white 
        shadow-2xl 
        z-10
        w-auto          /* let width size to content */
        max-w-[90vw]    /* but never exceed 90% of viewport */
        break-words     /* wrap long strings */
      "
    >
      <h2 className="text-lg font-bold mb-2">{gameOverMessage}</h2>
        <div className="font-medium">Your Score: {yourScore}</div>
      
      <button
        onClick={() => {
          setShowModal(false);
          setMessage("");
          setMinePositions([]);
          setCellsChosen([]);
        }}
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        OK
      </button>
    </div>
  </div>
)}

    </>
  );
}
