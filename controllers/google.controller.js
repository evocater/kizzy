/* require('dotenv').config */
const { default: axios } = require("axios");

async function getProfile(token){
  try{
    const response = await axios.get("https://www.googleapis.com/userinfo/v2/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    const data = await response.data;
  
   return data
  }catch(err){
    console.log(err)
  }
    
  
  }
  

  module.exports = {
    getProfile
 }