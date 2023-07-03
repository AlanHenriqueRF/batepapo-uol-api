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

    if (validation.error) return res.sendStatus(422);

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
server.post('/messages',async(req,res)=>{
    const {to, text,type}= req.body;
    const from = req.headers.user;

    const messageSchemec = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message','private_message').required(),
        from: joi.required()
    })

    const validation = messageSchemec.validate({...req.body,from:from},{abortEarly:false});

    if (validation.error) return res.sendStatus(422)

    if (!(await db.collection('participants').findOne({name:from}))) return res.sendStatus(422) 


    const nova_mensa = {
        from,
        to,
        text,
        type,
        time: dayjs(Date.now()).format('HH:mm:ss')
    }
    try{
        await db.collection('messages').insertOne(nova_mensa)
        res.sendStatus(201);
    }catch(err){
        res.sendStatus(500)
    }
})

server.get('/messages', async(req,res)=>{
    const limit = parseInt(req.query.limit);
    const {user} = req.headers;
    try{
        if (limit <= 0 || typeof(limit)!='number'){
            return res.sendStatus(422)
        }

        if (!limit){
            return res.send(await db.collection('messages').find({$or:[{to:"Todos"},{from:user},{to:user}]}).toArray());
        }
        const lastmessage = await db.collection('messages').find().sort({_id:-1}).limit(limit).toArray()
        return res.send(lastmessage.reverse())

    }
    catch(err){
        res.status(500).send(err.message);
    }
})

const PORT = 5000;
server.listen(PORT,()=>console.log(`O servidor esta rondando na porta ${PORT}`))