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
        if (limit <= 0 || typeof(limit)!='number' || !limit){
            return res.sendStatus(422)
        }

        if (!limit){
            return res.send(await db.collection('messages').find({$or:[{to:"Todos"},{from:user},{to:user}]}).toArray());
        }

        const lastmessage = await db.collection('messages').find({$or:[{to:"Todos"},{from:user},{to:user}]}).sort({_id:-1}).limit(limit).toArray()
        return res.send(lastmessage.reverse())

    }
    catch(err){
        res.status(500).send(err.message);
    }
})

//STATUS
server.post('/status',async(req,res)=>{
    const User = req.headers.user;
    if (!User) res.status(404).send('deu ruin aqui, ele acha que não mandei usuario no  headear');
    if (!(await db.collection('participants').findOne({name:User}))) return res.status(404).send('deu ruin aqui, minha logica esta ruin');

    try{
        //await db.collection('participants').insertOne({name:User,lastStatus:Date.now()})
        await db.collection('participants').update({name:User},{$set:{lastStatus:Date.now()}});
        res.sendStatus(200);
    }catch(err){
        res.sendStatus(500)
    }
})

//REMOÇÃO 
setInterval(async()=>{
    try{
        const tempo = Date.now()
        const participantes = await db.collection('participants').findmany({lastStatus:{$lte:tempo-10}}).toArray()

        const nova_mensagem_array = participantes.map((i)=>{
            return {
                from:i.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs(Date.now()).format('HH:mm:ss')
            }
        })
        await db.collection('participants').deleteMany({lastStatus:{$lte:tempo-10}})

        await db.collection('messages').insertMany(nova_mensagem_array);
  
    }catch(err){
        console.error(500)
    }
    
},15000)

const PORT = 5000;
server.listen(PORT,()=>console.log(`O servidor esta rondando na porta ${PORT}`))