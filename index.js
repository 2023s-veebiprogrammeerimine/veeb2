const express = require('express');
const app = express();
const fs = require('fs');
//kui kõik andmebaasi tegevused on pool'i ümber tõstetud, siis mysql moodulit siia ei ole vaja.
const mysql = require('mysql2');
const bodyparser = require('body-parser');
const dateInfo = require('./src/dateTimeFnc');
//kui kõik andmebaasi tegevused on pool'i ümber tõstetud, siis mysql moodulit siia ei ole vaja.
const dbConfig = require('../../../vp23config');
const dBase = 'if23_inga_pe_DM';
//kui kõik andmebaasi tegevused on pool'i ümber tõstetud, siis mysql moodulit siia ei ole vaja.
//const dataBase = 'if23_rinde';
const pool = require('./src/databasepool').pool;
const multer = require('multer');
//seame multer jaoks vahevara, mis määrab üleslaadimise kataloogi
const upload = multer({dest: './public/gallery/orig/'});
const mime = require('mime');//pigem 'file-type'
const sharp = require('sharp');
const async = require('async');
//krüpteerimiseks
const bcrypt = require('bcrypt');
//sessiooni jaoks
const session = require('express-session');
//app.use(bodyparser.urlencoded({extended: false}));
app.use(bodyparser.urlencoded({extended: true}));

app.use(session({secret: 'minuAbsoluutseltSalajaneVõti', saveUninitialized: true, resave: false}));

let mySession;

app.set('view engine', 'ejs');
app.use(express.static('public'));


//kasutame marsruute
const newsRouter = require('./routes/news');
app.use('/news', newsRouter);

//loon andmebaasiühenduse
const conn = mysql.createConnection({
	host: dbConfig.configData.host,
	user: dbConfig.configData.user,
	password: dbConfig.configData.password,
	database: dBase
});

//kui kõik saab pool'i, siis seda pole vaja
/* const connection = mysql.createConnection({
	host: dbConfig.configData.host,
	user: dbConfig.configData.user,
	password: dbConfig.configData.password,
	database: dataBase
}); */


//route
app.get('/', (req, res)=>{
	//res.send('See töötab!');
	res.render('index');
});

app.post('/', (req, res)=>{
	let notice = '';
	if(!req.body.emailInput || !req.body.passwordInput){
		console.log('Paha!');
		res.render('index', {notice: notice});
	}
	else {
		console.log('Hea!')
		let sql = 'SELECT id,password FROM vp_users WHERE email = ?';
		pool.getConnection((err, connection)=>{
			if(err){
				throw err;
			}
			else {
				//andmebaasi osa
				connection.execute(sql, [req.body.emailInput], (err, result)=>{
					if(err) {
						notice = 'Tehnilise vea tõttu sisse logida ei saa!';
						console.log('ei saa andmebaasisit loetud');
						res.render('index', {notice: notice});
						connection.release();
					}
					else {
						console.log(result);
						if(result.length == 0){
							console.log('Tühi!');
							notice = 'Viga kasutajatunnuses või paroolis!';
							res.render('index', {notice: notice});
							connection.release();
						}
						else {
							//võrdleme parooli andmebaasist saaduga
							bcrypt.compare(req.body.passwordInput, result[0].password, (err, compresult)=>{
								if(err){
									throw err;
								}
								else {
									if(compresult){
										console.log('Sisse!');
										notice = 'Saad sisse logitud!';
										mySession = req.session;
										mySession.userName = req.body.emailInput;
										mySession.userId = result[0].id;
										res.render('index', {notice: notice});
										connection.release();
									}
									else {
										console.log('Jääd välja!');
										notice = 'Ei saa sisse logitud!';
										res.render('index', {notice: notice});
										connection.release();
									}
								}
							});
						}
					}
				});
				//andmebaasi osa lõppeb
			}
		});
	}
	//res.render('index', {notice: notice});
});

app.get('/logout', (req, res)=>{
	console.log(mySession.userName);
	console.log('Välja!');
	req.session.destroy();
	mySession = null;
	res.redirect('/');
});

app.get('/signup', (req, res)=>{
	res.render('signup');
});

app.post('/signup', (req, res)=>{
	let notice = 'Ootel!';
	console.log(req.body);
	// javascript AND ->   &&    OR ->   ||
	if(!req.body.firstNameInput || !req.body.lastNameInput || !req.body.genderInput || !req.body.birthInput || !req.body.emailInput || !req.body.passwordInput || req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput){
		console.log('andmeid puudu või sobimatud!');
		notice = 'Andmeid puudu või sobimatud!';
		res.render('signup', {notice: notice});
	}
	else {
		console.log('OK!');
		notice = 'Ok!';
		//"soolame" ja krüpteerime parooli
		bcrypt.genSalt(10, (err, salt)=>{
			bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash)=>{
				let sql = 'INSERT INTO vp_users (firstname, lastname, birthdate, gender, email, password) VALUES(?,?,?,?,?,?)';
				//teeme andmebaasiühenduse pool'i kaudu
				pool.getConnection((err, connection)=>{
					if(err){
						throw err;
					}
					else {
						//andmebaasi osa
						connection.execute(sql, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result)=>{
							if(err){
								notice = 'Andmete salvestamine ebaõnnestus!';
								res.render('signup', {notice: notice});
								connection.release();
							}
							else {
								notice = 'Kasutaja ' + req.body.emailInput + ' lisamine õnnestus!';
								res.render('signup', {notice: notice});
								connection.release();
							}
						});
						//andmebaasi osa
					}
				});
			});
		});		
	}
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

app.get('/eestifilm/lisaseos', (req, res)=>{
	//res.send('See töötab!');
	//paneme async mooduli abil mitu asja korraga tööle
	//1) loome tegevuste loendi
	const myQueries = [
		function(callback){
			conn.execute('SELECT id,title from movie', (err, result)=>{
				if(err) {
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			conn.execute('SELECT id,first_name, last_name from person', (err, result)=>{
				if(err) {
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		}
	];
	//paneme need tegevused asünkroonselt paralleelselt tööle
	async.parallel(myQueries, (err, results)=>{
		if (err) {
			throw err;
		}
		else {
			//console.log(results);
			//mis kõik teha, ka render osa vajalike tükkidega
		}
	});
	
	
	res.render('eestifilmaddrelation');
});

/* app.get('/news', (req,res)=> {
	res.render('news');
});

app.get('/news/add', (req,res)=> {
	res.render('addnews');
});

app.post('/news/add', (req, res)=>{
	if(!req.body.titleInput || !req.body.contentInput || !req.body.expireDateInput){
		console.log('Uudisega jama');
		notice = 'Andmeid puudu!';
		res.render('addnews', {notice: notice});
	}
	else {
		let sql = 'INSERT INTO vp_news (title, content, expire, userid) VALUES(?,?,?,?)';
		let userid = 1;
		//teeme andmebaasiühenduse pool'i kaudu
		pool.getConnection((err, connection)=>{
			if(err){
				throw err;
			}
			else {
				//andmebaasi osa
				connection.execute(sql, [req.body.titleInput, req.body.contentInput, req.body.expireDateInput, userid], (err, result)=>{
					if(err) {
						throw err;
						notice = 'Uudise salvestamine ebaõnnestus!';
						res.render('addnews', {notice: notice});
						connection.release();
					} else {
						notice = 'Uudis edukalt salvestatud!';
						res.render('addnews', {notice: notice});
						connection.release();
					}
				});
				//andmebaasi osa
			}
		});//pool'i osa lõppeb
	}
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
 */
app.get('/photoupload', checkLogin, (req, res)=> {
	console.log('Sisseloginuid kasutaja: ' + req.session.userId);
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
	//const userid = 1;
	//teeme andmebaasiühenduse pool'i kaudu
	pool.getConnection((err, connection)=>{
		if(err){
			throw err;
		}
		else {
			//andmebaasi osa
			connection.execute(sql, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, req.session.userId], (err, result)=>{
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
			//andmebaasi osa
		}
	});
	
});

app.get('/photogallery', (req, res)=> {
	let photoList = [];
	let privacy = 3;
	if(req.session.userId){
		privacy = 2;
	}
	let sql = 'SELECT id,filename,alttext FROM vp_gallery WHERE privacy >= ? AND deleted IS NULL ORDER BY id DESC';
	//teeme andmebaasiühenduse pool'i kaudu
	pool.getConnection((err, connection)=>{
		if(err){
			throw err;
		}
		else {
			//andmebaasi osa
			connection.execute(sql, [privacy], (err,result)=>{
				if (err){
					throw err;
					res.render('photogallery', {photoList : photoList});
					connection.release();
				}
				else {
					photoList = result;
					//console.log(result);
					res.render('photogallery', {photoList : photoList});
					connection.release();
				}
			});
			//andmebaasi osa
		}//getConnection else lõppeb
	});//pool.getConnection lõppeb
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

//funktsioon, mis kontrollib sisselogimist. On vahevara (middleware)
function checkLogin(req, res, next){
	console.log('Kontrollime, kas on sisse logitud!');
	if(mySession != null){
		if(mySession.userName){
			console.log('Ongi sees!');
			next();
		}
		else {
			console.log('Polnud sisse loginud!');
			res.redirect('/');
		}
	}
	else {
		console.log('Polnud sisse loginud!');
		res.redirect('/');
	}
}

app.listen(5200);