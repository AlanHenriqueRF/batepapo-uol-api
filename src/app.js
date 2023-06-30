import express from "express";
import cors from "cors";

const server = express();
server.use(cors());
server.use(express.json())

server.get('/teste',(req,res)=>{
    res.send('Isso é um teste')
})

const PORT = 5000;
server.listen(PORT,()=>console.log(`O servidor esta rondando na porta ${PORT}`))