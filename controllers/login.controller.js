const jwt = require("jsonwebtoken");
const { PrismaClient } = require(`@prisma/client`);
const prisma = new PrismaClient();
const Joi = require("joi");
const e = require("cors");
const axios = require("axios")
const { getAssociatedTokenAddressSync, getAccount, getMint } = require('@solana/spl-token');
const EventEmitter = require("events");
const moment = require("moment");
const myEmitter = new EventEmitter();
const {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  AccountMeta
} = require("@solana/web3.js");
const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} = require("@solana/spl-token");
const connection = new Connection(process.env.RPC_URL);
const {getProfile} = require('./google.controller')
const crypto = require('crypto');


const algorithm = 'aes-256-cbc'; // AES encryption in CBC mode
const key = crypto.randomBytes(32); // AES-256 uses 256-bit (32-byte) keys
const iv = crypto.randomBytes(16);  // AES block size is 128 bits (16 bytes)

// Function to encrypt data
function encrypt(data) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return {
      iv: iv.toString('hex'),
      encryptedData: encrypted.toString('hex')
  };
}

// Decrypt to Uint8Array
function decrypt(encryptedObj) {
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(encryptedObj.iv, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedObj.encryptedData, 'hex')), decipher.final()]);
  return new Uint8Array(decrypted);
}
// Example usage:

async function getTokenBalanceSpl(connection, wallet) {
  try{
    const tokenmint = new PublicKey("B5mAAXCVYxRMoLEHG55XSqFu5bUcUFwM2sPcjf1fZTU7")
    const owner = new PublicKey(wallet)
    const address = getAssociatedTokenAddressSync(tokenmint, owner)
  
    const tokenAccount = new PublicKey(address.toBase58())
    
    const info = await getAccount(connection, tokenAccount);
    const amount = Number(info.amount);
    const mint = await getMint(connection, info.mint);
    const balance = amount / (10 ** mint.decimals);
    return balance;
  }catch(err){
    return 0
  }

 
}



async function getUser(userID) {

      const user = await prisma.user.findUnique({
        where: { ID: userID },
        select:{
          googleID: true,
          createdAt: true,
          updatedAt: true,
          balance: true,
          status: true,
          email: true,
          familyName: true,
          name: true,
          avatar: true,
          wallet:{
            select:{
              walletAddress:true,
              listen:true
            }
          }
        }
      });
  
      return user;
  }
  
  async function createWebhook(wallet) {
    try {
      const response = await axios.post(
        "https://api.helius.xyz/v0/webhooks?api-key=5e7cbda8-653e-49de-ad69-a1a00a743a70",
        {
          "webhookURL": "https://web-production-603f.up.railway.app/api/v1/getList",
          "accountAddresses": [wallet],
          "transactionTypes": ["DEPOSIT", "TRANSFER"],
          "webhookType": "enhanced"
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      const data = response.data;
      if(data){
        
        await prisma.wallet.update({
          where:{walletAddress: wallet},
          data:{
            listen: true
          }
        })




      }
    } catch (e) {
      console.error("error", e);
    }
  };

async function login(req, res) {
    try {
      const loginSchema = Joi.object({
        accessToken: Joi.string().required(),
      });
      const { error } = loginSchema.validate(req.body, { abortEarly: true });
  
      if (error) {
      
        return res.status(500).json({ error: "Invalid Login Request" });
      }
      res.set('Connection', 'keep-alive');

      const google = await getProfile(req.body.accessToken)
      

      let keypair = Keypair.generate();

      const encrypted = encrypt(keypair.secretKey);
      /* const decrypted = decrypt(encrypted); */


      const user = await prisma.user.upsert({
        where: { googleID: google.id },
        create: {
          googleID: google.id,
          name:google.name,
          avatar:google.picture,
          familyName: google.family_name,
          email:google.email,
          wallet:{
            create:{
              walletAddress: keypair.publicKey.toString(),
              iv:encrypted.iv,
              encryptedData:encrypted.encryptedData
            }
          
          }
        },
  
        update: {
          name:google.name,
          avatar:google.picture,
          familyName: google.family_name,
          email:google.email
        },
      });
            
      console.log(user)
      return res.status(200).json({
        token: jwt.sign({ ID: user.ID }, process.env.JWT_SECRET, {
          expiresIn: "20d",
        }),
      });
    } catch (err) {
      console.log(err)
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }


  async function getList(req, res){
    if (req.body && req.body[0] && Array.isArray(req.body[0].tokenTransfers)) {
      console.log(req.body)
      
          if(req.body[0].tokenTransfers[0].mint == "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"){

            const user = await prisma.wallet.findUnique({
              where:{walletAddress: req.body[0].tokenTransfers[0].toUserAccount},
              select:{
                user:{
                  select:{
                    ID:true
                  }
                }
              }
            })

            if(user){
              myEmitter.emit('sendKizz', [{ toWallet: req.body[0].tokenTransfers[0].toUserAccount, amount:req.body[0].tokenTransfers[0].tokenAmount, user: user.user.ID}]);
            }
      
          } 
       
    } else {
        console.error('Token Transfer is not available or not an array');
    }
    return res.status(200).json({Message: 'Success!'})


  }


  myEmitter.on("sendKizz", async (data) => {
    
  try{

    const TRANSFER_AMOUNT = Number(data[0].amount);
    const FROM_KEYPAIR = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SECRET))
    );

  
    const DESTINATION_WALLET = data[0].toWallet;
    const MINT_ADDRESS = "B5mAAXCVYxRMoLEHG55XSqFu5bUcUFwM2sPcjf1fZTU7";

   
  
    console.log(`Setting Up Transaction check Token Account`);
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      FROM_KEYPAIR,
      new PublicKey(MINT_ADDRESS),
      FROM_KEYPAIR.publicKey
    );
    console.log(` Source Account: ${sourceAccount.address.toString()}`);
  
    console.log(` Getting Destination Token Account`);
    let destinationAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      FROM_KEYPAIR,
      new PublicKey(MINT_ADDRESS),
      new PublicKey(DESTINATION_WALLET)
    );
    console.log(` Destination Account: ${destinationAccount.address.toString()}`);
  
    const numberDecimals = await getNumberDecimals(MINT_ADDRESS);
    console.log(`Number of Decimals: ${numberDecimals}`);
  
    const tx = new Transaction();
    tx.add(
      createTransferInstruction(
        sourceAccount.address,
        destinationAccount.address,
        FROM_KEYPAIR.publicKey,
        TRANSFER_AMOUNT * Math.pow(10, numberDecimals)
      )
    );
  
    const latestBlockHash = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = await latestBlockHash.blockhash;
    const signature = await sendAndConfirmTransaction(connection, tx, [
      FROM_KEYPAIR,
    ]);

    await prisma.transaction.create({
      data: {
        user: {
          connect: {
            ID: data[0].user, // connect to existing user by ID
          },
        },

        total: TRANSFER_AMOUNT,
        wallet: data[0].toWallet,
        status: 'Confirmed',
        type: "Deposit",
        updatedAt: new Date(),
        solscan: signature,
        timestamp: moment().unix()
      },
    })

    console.log(
      "\x1b[32m", //Green Text
      `   Transaction Success!`,
      `\n    https://solscan.io/tx/${signature}`
    );
    }catch(err){
      console.log(err)
    }
  })

  async function getNumberDecimals(mintAddress) {
  const info = await connection.getParsedAccountInfo(
    new PublicKey(mintAddress)
  );
  const result = (info.value?.data).parsed.info.decimals;
  return result;
}
  
  async function my(req, res) {
    try {
      let token = req.headers["authorization"];
  
      if (!token) {
        return res.status(500).json({ error: "Please provide valid token!" });
      }
  
      token = token.replace(/^Bearer\s+/, "");
  
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: "Token is not valid",
          });
        }

        console.log(err)
        } else {
          id = decoded.ID;
        }
      });
      
      res.set('Connection', 'keep-alive');
     
  
      const result = await getUser(id);
      if(!result.wallet.listen){
        await createWebhook(result.wallet.walletAddress)
      }

      result['kizz'] = await getTokenBalanceSpl(connection, result.wallet.walletAddress)

      return res.status(200).json(result);
    } catch (err) {
      console.log(err)
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      
    }
  }


  async function getTransaction(req, res){
    try {
      let token = req.headers["authorization"];
  
      if (!token) {
        return res.status(500).json({ error: "Please provide valid token!" });
      }
  
      token = token.replace(/^Bearer\s+/, "");
  
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: "Token is not valid",
          });
        }

        console.log(err)
        } else {
          id = decoded.ID;
        }
      });
      
      res.set('Connection', 'keep-alive');


      const transactions = await prisma.transaction.findMany({
        where:{userID: id}
      })

      return res.status(200).json(transactions)
     
    }catch(err){
      console.log(err)
    }
  }





  

module.exports = {
    login,
    my,
    getList,
    getTransaction
}