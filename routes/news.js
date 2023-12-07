const express = require('express');
//loome marsruutimise miniäpi
const router = express.Router();//suur "R" on oluline!!!
const pool = require('../src/databasepool').pool;

//kuna siin on kasutusel miniäpp router, siis kõik marsruudid on router'il mitte app'il
//kuna kõik siinsed marsruudid algavad osaga "/news", siis seda pole vaja kirjutada

router.get('/', (req,res)=> {
	res.render('news');
});

router.get('/add', (req,res)=> {
	res.render('addnews');
});

router.post('/add', (req, res)=>{
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

router.get('/read', (req,res)=> {
	res.render('readnews');
});

router.get('/read/:id', (req,res)=> {
	//res.render('readnews');
	console.log(req.params);
	console.log(req.query);
	res.send('Vaatame uudist, mille id on: ' + req.params.id);
});

module.exports = router;