import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
import dayjs from "dayjs";
import joi from "joi";

const server = express();
server.use(cors());
server.use(express.json())
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
    .then(()=>db = mongoClient.db())
    .catch((err)=>console.log(err.response))

// PARTICIPANTS
server.post('/participants',async(req,res)=>{
    const {name} = req.body;

    const partiScheme = joi.object({
        name: joi.string().required()
    })

    const validation = partiScheme.validate(req.body, {abortEarly:false});

    if (validation.error) return res.status(422);

    const lastStatus = Date.now();
    const novoparticpante = {name,lastStatus}
    const nova_mensa = { 
		from: name,
		to: 'Todos',
		text: 'entra na sala...',
		type: 'status',
		time: dayjs(lastStatus).format('HH:mm:ss')
    }

    try{
        if (await db.collection('participants').findOne({name:name})){
            return res.sendStatus(409);
        }

        await db.collection('participants').insertOne(novoparticpante);
        await db.collection('messages').insertOne(nova_mensa);
        res.sendStatus(201);
    }catch(err){
        res.status(500).send(err.message)

    }
})

server.get('/participants',async(req,res)=>{
    try{
        res.send(await db.collection('participants').find().toArray());
    }
    catch(err){
        res.status(500).send(err.message);
    }
})

//MESSAGES
server.post('/messages',(req,res)=>{
    const {to, text,type}= req.body;
    const nova_mensa = {
        to: "Maria",
        text: "oi sumida rs",
        type: "private_message",
        time: dayjs(Date.now()).format('HH:mm:ss')
    }
    res.sendStatus(201);
})

const PORT = 5000;
server.listen(PORT,()=>console.log(`O servidor esta rondando na porta ${PORT}`))