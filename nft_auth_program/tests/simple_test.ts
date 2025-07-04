import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

describe("simple test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the IDL manually
  const idl = require("../target/idl/nft_auth_program.json");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  const program = new Program(idl, programId, provider);

  it("Can connect to program", async () => {
    console.log("Program ID:", program.programId.toString());
    console.log("Test passed!");
  });
});
