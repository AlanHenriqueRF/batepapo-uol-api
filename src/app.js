import express from "express";
import cors from "cors";

const server = express();
server.use(cors());
server.use(express.json())

const participantes = [];

server.post('/participants',(req,res)=>{
    const {name} = req.body;
    if (participantes.includes(name)){
        return res.sendStatus(409);
    }
    participantes.push(name);
    res.sendStatus(201)
})

server.get('/participants',(req,res)=>{
    res.send(participantes);
})

const PORT = 5000;
server.listen(PORT,()=>console.log(`O servidor esta rondando na porta ${PORT}`))