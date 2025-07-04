import * as crypto from "crypto";
import * as anchor from "@coral-xyz/anchor";

describe("Find Correct Discriminators", () => {
  it("Calculate instruction discriminators", () => {
    // Function to calculate Anchor instruction discriminator
    function getDiscriminator(name: string): Buffer {
      return Buffer.from(
        crypto.createHash("sha256")
          .update(`global:${name}`)
          .digest()
      ).slice(0, 8);
    }

    console.log("📋 Instruction Discriminators:");
    console.log("initialize:", Array.from(getDiscriminator("initialize")));
    console.log("register_product:", Array.from(getDiscriminator("register_product")));
    console.log("create_collection:", Array.from(getDiscriminator("create_collection")));
    console.log("mint_nft:", Array.from(getDiscriminator("mint_nft")));
    console.log("create_nft_metadata:", Array.from(getDiscriminator("create_nft_metadata")));
    console.log("toggle_pause:", Array.from(getDiscriminator("toggle_pause")));
    
    console.log("\n📋 As hex:");
    console.log("register_product hex:", getDiscriminator("register_product").toString("hex"));
  });
});
