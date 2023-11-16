const express = require('express');
const app = express();
const fs = require('fs');
const mysql = require('mysql2');
const bodyparser = require('body-parser');
const dateInfo = require('./dateTimeFnc');
const dbConfig = require('../../../vp23config');
const dBase = 'if23_inga_pe_DM';
const dataBase = 'if23_rinde';
const multer = require('multer');
//seame multer jaoks vahevara, mis määrab üleslaadimise kataloogi
const upload = multer({dest: './public/gallery/orig/'});
const mime = require('mime');
const sharp = require('sharp');

app.set('view engine', 'ejs');
app.use(express.static('public'));
//app.use(bodyparser.urlencoded({extended: false}));
app.use(bodyparser.urlencoded({extended: true}));

//loon andmebaasiühenduse
const conn = mysql.createConnection({
	host: dbConfig.configData.host,
	user: dbConfig.configData.user,
	password: dbConfig.configData.password,
	database: dBase
});

const connection = mysql.createConnection({
	host: dbConfig.configData.host,
	user: dbConfig.configData.user,
	password: dbConfig.configData.password,
	database: dataBase
});


//route
app.get('/', (req, res)=>{
	//res.send('See töötab!');
	res.render('index');
});

app.get('/timenow', (req, res)=>{
	const dateNow = dateInfo.dateNowET();
	const timeNow = dateInfo.timeNowET();
	res.render('timenow', {dateN: dateNow, timeN: timeNow});
});

app.get('/wisdom', (req, res)=>{
	let folkWisdom = [];
	fs.readFile("public/txtfiles/vanasonad.txt", "utf8", (err, data)=>{
		if(err){
			console.log(err);
		}
		else {
			folkWisdom = data.split(";");
			res.render('justlist', {h1: 'Vanasõnad', wisdoms: folkWisdom});
		}
	});
});

app.get('/eestifilm', (req, res)=>{
	//res.send('See töötab!');
	res.render('eestifilmindex');
});

app.get('/eestifilm/filmiloend', (req, res)=>{
	//res.send('See töötab!');
	let sql = 'SELECT title, production_year FROM movie';
	let sqlresult = [];
	conn.query(sql, (err, result)=>{
		if (err) {
			throw err;
			res.render('eestifilmlist', {filmlist: sqlresult});
		}
		else {
			//console.log(result);
			//console.log(result[4].title);
			sqlresult = result;
			//console.log(sqlresult);
			res.render('eestifilmlist', {filmlist: sqlresult});
		}
	});
	//res.render('eestifilmlist', {filmlist: sqlresult});
});

app.get('/eestifilm/lisapersoon', (req, res)=>{
	//res.send('See töötab!');
	res.render('eestifilmaddperson');
});

app.get('/news', (req,res)=> {
	res.render('news');
});


app.get('/news/add', (req,res)=> {
	res.render('addnews');
});

app.get('/news/read', (req,res)=> {
	res.render('readnews');
});

app.get('/news/read/:id', (req,res)=> {
	//res.render('readnews');
	console.log(req.params);
	console.log(req.query);
	res.send('Vaatame uudist, mille id on: ' + req.params.id);
});

app.get('/photoupload', (req, res)=> {
	res.render('photoupload');
});

app.post('/photoupload', upload.single('photoInput'), (req, res)=> {
	let notice = '';
	console.log(req.file);
	console.log(req.body);
	//const mimeType = mime.getType(req.file.path);
	//console.log(mimeType);
	const fileName = 'vp_' + Date.now() + '.jpg';
	//fs.rename(req.file.path, './public/gallery/orig/' + req.file.originalname, (err)=> {
	fs.rename(req.file.path, './public/gallery/orig/' + fileName, (err)=> {
		console.log('Viga: ' + err);
	});
	const mimeType = mime.getType('./public/gallery/orig/' + fileName);
	console.log('Tüüp: ' + mimeType);
	//loon pildist pisipildi (thumbnail)
	sharp('./public/gallery/orig/' + fileName).resize(800,600).jpeg({quality : 90}).toFile('./public/gallery/normal/' + fileName);
	sharp('./public/gallery/orig/' + fileName).resize(100,100).jpeg({quality : 90}).toFile('./public/gallery/thumbs/' + fileName);
	
	
	let sql = 'INSERT INTO vp_gallery (filename, originalname, alttext, privacy, userid) VALUES (?,?,?,?,?)';
	const userid = 1;
	connection.query(sql, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userid], (err, result)=>{
		if(err) {
			throw err;
			notice = 'Foto andmete salvestamine ebaõnnestus!' + err;
			res.render('photoupload', {notice: notice});
		}
		else {
			notice = 'Pilt "' + req.file.originalname + '" laeti üles!';
			res.render('photoupload', {notice: notice});
		}
	});
	
	
});

app.get('/photogallery', (req, res)=> {
	
	res.render('photogallery');
});

app.post('/eestifilm/lisapersoon', (req, res)=>{
	console.log(req.body);
	let notice = '';
	let sql = 'INSERT INTO person (first_name, last_name, birth_date) VALUES (?,?,?)';
	conn.query(sql, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput], (err, result)=>{
		if(err) {
			throw err;
			notice = 'Andmete salvestamine ebaõnnestus!' + err;
			res.render('eestifilmaddperson', {notice: notice});
		}
		else {
			notice = 'Filmitegelase ' + req.body.firstNameInput + ' ' + req.body.lastNameInput + ' salvestamine õnnestus!';
			res.render('eestifilmaddperson', {notice: notice});
		}
	});
});

app.listen(5200);