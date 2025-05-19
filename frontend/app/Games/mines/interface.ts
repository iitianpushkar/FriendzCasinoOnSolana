"use client";

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface PlayerState {
  player: PublicKey;
  score: number;        // u8
  clicked: number[];    // Vec<u8>
  active: boolean;
}

export interface Room {
  leader: PublicKey;
  exists: boolean;
  mines: number;            // u8
  gems: number;             // u8
  betAmount: BN;            // u64
  started: boolean;
  minesRevealed: boolean;
  committedMineHash: Uint8Array;  // [u8;32]
  joined: PublicKey[];      // Vec<Pubkey>
  active: PublicKey[];      // Vec<Pubkey>
  totalBet: BN;             // u64
  players: PlayerState[];   // Vec<PlayerState>
  roomId: string;
  bump: number;             // u8
}
