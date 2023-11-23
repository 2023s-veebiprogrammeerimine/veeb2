//console.log("Töötab!");
let fileSizeLimit = 1.5 * 1024 * 1024;

window.onload = function(){
	//document.getElementById("photoSubmit")
	document.querySelector("#photoSubmit").disabled = true;
	document.querySelector("#infoPlace").innerHTML = "Pilti pole valitud!";
	document.querySelector("#photoInput").addEventListener("change", checkPhotoSize);
}

function checkPhotoSize(){
	//console.log("Töötab!");
	//console.log(document.querySelector("#photoInput").files[0].size);
	if(document.querySelector("#photoInput").files[0].size <= fileSizeLimit){
		document.querySelector("#photoSubmit").disabled = false;
		document.querySelector("#infoPlace").innerHTML = "";
	} else {
		document.querySelector("#photoSubmit").disabled = true;
		document.querySelector("#infoPlace").innerHTML = "Valitud pilt on liiga suure failimahuga!";
	}
}