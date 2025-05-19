"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  useConnection,
  useAnchorWallet,           // ← import this instead of useWallet
} from "@solana/wallet-adapter-react";
import { AnchorProvider, Program,Idl } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./abi.json";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

const PROGRAM_ID = new PublicKey("5rFYLcFJRuNgnmYy9GEgXbV4mYw7K7S3SwxTXncc4F1w");

interface ProgramContextType {
  provider: AnchorProvider | null;
  program: Program | null;
}

const ProgramContext = createContext<ProgramContextType>({
  provider: null,
  program: null,
});

export const ProgramProvider = ({ children }: { children: React.ReactNode }) => {
  const wallet = useAnchorWallet();      // ← this is your Anchor-compatible wallet
  const { connection } = useConnection();

  const provider = useMemo(() => {
    if (!wallet) return null;            // Wait until wallet is connected
    return new AnchorProvider(
      connection,
      wallet as AnchorWallet,            // AnchorWallet has the needed methods
      { commitment: "processed" }
    );
  }, [wallet, connection]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as Idl, PROGRAM_ID, provider);
  }, [provider]);

  return (
    <ProgramContext.Provider value={{ provider, program }}>
      {children}
    </ProgramContext.Provider>
  );
};

export const useProgram = () => useContext(ProgramContext);