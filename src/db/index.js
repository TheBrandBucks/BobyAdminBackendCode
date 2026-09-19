// db/supabaseClient.js
// import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv';
// dotenv.config();
// console.log("Supabese Credentials:",process.env.supabaseUrl,"and key:",process.env.SUPABASE_KEY)
// const supabase = createClient(process.env.supabaseUrl, process.env.SUPABASE_KEY);
// export default supabase;







{/*Mongo Db connection*/}
// import {DB_NAME} from "../constants.js";
// import mongoose from "mongoose";

// const ConnectDB=async () =>
//     {
// try {
//     let res=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

//     console.log("hi server is connected with DB on this Host:",res.connection.host);// on which host the server is conneteing with DB
  
// } catch (error) {
//     console.log("Error during Db connection:",error);
//     process.exit(1)
// }
// }
// export default ConnectDB