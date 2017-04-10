// ==================================
// Part 1 - incoming messages, look for type
// ===================================
var ibc = {};
var chaincode = {};
var async = require('async');

module.exports.setup = function(sdk, cc){
	ibc = sdk;
	chaincode = cc;
};

module.exports.process_msg = function(ws, data){
	if(data.v === 1){																						//only look at messages for part 1
		if(data.type == 'create'){
			console.log('its a create!');
			if(data.name && data.color && data.size && data.user){
				chaincode.invoke.init_marble([data.name, data.color, data.size, data.user], cb_invoked);	//create a new marble
			}
		}
		else if(data.type == 'signup'){
			console.log('its a signup!');
			//if(data.name && data.color && data.size && data.user){
				chaincode.invoke.signup_driver([data.firstname, data.lastname, data.email, data.password], cb_invoked);	//create a new marble
			//}
		}
		else if(data.type == 'checkdriverdetails'){
			console.log('its a checkdriverdetails!');
			//if(data.name && data.color && data.size && data.user){
			chaincode.query.read([data.checkdriveremail], cb_got_driver);
//			chaincode.query.read([data.checkdriveremail], function(e, driver) {
//				if(e != null) console.log('[ws error] did not get driver:', e);
//				else {
//					if(driver!= null) sendMsg({msg: 'driver', e: e, driver: JSON.parse(driver)});
//					cb(null);
//				}
//			});
			//}
		}
		else if(data.type == 'get'){
			console.log('get marbles msg');
			chaincode.query.read(['_marbleindex'], cb_got_index);
		}
		else if(data.type == 'transfer'){
			console.log('transfering msg');
			if(data.name && data.user){
				chaincode.invoke.set_user([data.name, data.user]);
			}
		}
		else if(data.type == 'remove'){
			console.log('removing msg');
			if(data.name){
				chaincode.invoke.delete_marble([data.name]);
			}
		}
		else if(data.type == 'chainstats'){
			console.log('chainstats msg');
			ibc.chain_stats(cb_chainstats);
		}
	}
	
	
	
	function cb_got_driver(e, checkdriver) {
		if(e != null) console.log('[ws error] did not get driver:', e);
		else {
				//try{
					//var jsondriver = JSON.parse(checkdriverobj);
					console.log('Driver details received ' + checkdriver);
					
					var temp = new Array();
					temp = checkdriver.split(",");
					
					var temp1 = temp[2].split[":"];
					
					temp1[1]='"' + temp[1] +"'";
					
					temp[2]=temp1[0] + ":" + temp1[1];
					
					checkdriver = temp[0]+","+temp[1]+","+temp[2]+","+temp[3];
					
					console.log('Driver details updated ' + checkdriver);
					
				//	if(checkdriver!= null) sendStringMsg({msg: 'driver', e: e, driver: checkdriver});
					
					//console.log('Driver details');
					//cb(null);
				//}
				//catch(e){
				//	console.log('[ws error] could not parse response', e);
				//}
			}
	}
	
	

	//got the marble index, lets get each marble
	function cb_got_index(e, index){
		if(e != null) console.log('[ws error] did not get marble index:', e);
		else{
			try{
				var json = JSON.parse(index);
				var keys = Object.keys(json);
				var concurrency = 1;

				//serialized version
				async.eachLimit(keys, concurrency, function(key, cb) {
					console.log('!', json[key]);
					chaincode.query.read([json[key]], function(e, marble) {
						if(e != null) console.log('[ws error] did not get marble:', e);
						else {
							if(marble) sendMsg({msg: 'marbles', e: e, marble: JSON.parse(marble)});
							cb(null);
						}
					});
				}, function() {
					sendMsg({msg: 'action', e: e, status: 'finished'});
				});
			}
			catch(e){
				console.log('[ws error] could not parse response', e);
			}
		}
	}
	
	function cb_invoked(e, a){
		console.log('response: ', e, a);
	}
	
	//call back for getting the blockchain stats, lets get the block stats now
	function cb_chainstats(e, chain_stats){
		if(chain_stats && chain_stats.height){
			chain_stats.height = chain_stats.height - 1;								//its 1 higher than actual height
			var list = [];
			for(var i = chain_stats.height; i >= 1; i--){								//create a list of heights we need
				list.push(i);
				if(list.length >= 8) break;
			}
			list.reverse();																//flip it so order is correct in UI
			async.eachLimit(list, 1, function(block_height, cb) {						//iter through each one, and send it
				ibc.block_stats(block_height, function(e, stats){
					if(e == null){
						stats.height = block_height;
						sendMsg({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
					}
					cb(null);
				});
			}, function() {
			});
		}
	}
	
	//send a message, socket might be closed...
	function sendMsg(json){
		if(ws){
			try{
				ws.send(JSON.stringify(json));
				console.log('[ws info] sent the msg', JSON.stringify(json));
			}
			catch(e){
				console.log('[ws error] could not send msg', e);
			}
		}
	}
	
	function sendStringMsg(jsonstring){
		if(ws){
			try{
				ws.send(jsonstring);
				console.log('[ws info] sent the msg', json);
			}
			catch(e){
				console.log('[ws error] could not send msg', e);
			}
		}
	}
};